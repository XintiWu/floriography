import { NextResponse } from "next/server";
import { getCards, getFlowers } from "@/lib/catalog";
import { recognizeFlowerFromBuffer } from "@/lib/flowerRecognition";

export async function POST(req: Request) {
  try {
    let buf: Buffer | null = null;

    // 支援 FormData 上傳或 JSON 的 base64 圖片
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data") || contentType.includes("form-data")) {
      const form = await req.formData();
      const file = form.get("image") as any;
      if (!file) return NextResponse.json({ error: "no_image" }, { status: 400 });
      const ab = await file.arrayBuffer();
      buf = Buffer.from(ab);
    } else {
      // 允許傳送 JSON: { imageBase64: "data:image/...;base64,..." }
      const body = await req.json().catch(() => ({}));
      const b64 = body.imageBase64 || body.image || null;
      if (!b64) return NextResponse.json({ error: "no_image" }, { status: 400 });
      const raw = String(b64).split(",").pop();
      if (!raw) return NextResponse.json({ error: "invalid_base64" }, { status: 400 });
      buf = Buffer.from(raw, "base64");
    }

    const recog = await recognizeFlowerFromBuffer(buf!);

    const flowers = await getFlowers();
    const cards = await getCards();

    const matchedFlower = flowers.find(
      (f) => f.name.toLowerCase() === recog.name.toLowerCase()
    ) || flowers.find((f) => recog.name.toLowerCase().includes(f.name.toLowerCase()));

    let recommendations = [] as any[];

    if (matchedFlower) {
      // 嘗試找出包含該花的作品（先以 tags 判斷，接著以標題/描述關鍵字）
      const hits = cards.filter((c) => {
        if (Array.isArray(c.tags?.flowers) && c.tags.flowers.length > 0) {
          return c.tags.flowers.some((fn) => fn.toLowerCase() === matchedFlower.name.toLowerCase());
        }
        const title = (c.title || "").toLowerCase();
        const blurb = (c.blurb || "").toLowerCase();
        return title.includes(matchedFlower.name.toLowerCase()) || blurb.includes(matchedFlower.name.toLowerCase());
      });

      if (hits.length > 0) {
        recommendations = hits.slice(0, 3).map((card) => ({
          card,
          why: `辨識到花種為「${matchedFlower.name}」，系統找到包含此花材或相關描述的作品。`,
        }));
      }
    }

    // 若沒有命中或系統沒有該花，隨機推薦三件作品
    if (recommendations.length === 0) {
      const shuffled = cards.sort(() => 0.5 - Math.random());
      recommendations = shuffled.slice(0, 3).map((card) => ({
        card,
        why: matchedFlower
          ? `辨識出「${recog.name}」，但系統資料庫找不到對應花種，改以隨機推薦相近風格的作品。`
          : `系統未辨識到已知花種，隨機推薦作品供參考。`,
      }));
    }

    return NextResponse.json({
      recognizedName: recog.name,
      confidence: recog.confidence,
      engine: recog.engine,
      matchedFlower: matchedFlower ?? null,
      recommendations,
    });
  } catch (err) {
    console.error("Recognize API error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
