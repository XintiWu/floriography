import { NextResponse } from "next/server";
import { recognizeFlowerFromBuffer } from "@/lib/flowerRecognition";
import { getCards, getFlowers } from "@/lib/catalog";

export async function GET() {
  try {
    // 以空 Buffer 呼叫辨識 helper（會走 fallback 模擬）
    const recog = await recognizeFlowerFromBuffer(Buffer.from(""));

    const flowers = await getFlowers();
    const cards = await getCards();

    // 嘗試匹配
    const matchedFlower = flowers.find(
      (f) => f.name.toLowerCase() === recog.name.toLowerCase()
    );

    let recommendations = [] as any[];
    if (matchedFlower) {
      const hits = cards.filter((c) => (c.tags?.flowers || []).some((fn) => fn.toLowerCase() === matchedFlower.name.toLowerCase()) || (c.title || "").toLowerCase().includes(matchedFlower.name.toLowerCase()));
      recommendations = hits.slice(0, 3).map((card) => ({ card, why: `測試：辨識為 ${matchedFlower.name}，找到包含此花材的作品。` }));
    }

    if (recommendations.length === 0) {
      recommendations = cards.slice(0, 3).map((card) => ({ card, why: `測試模式：隨機推薦。` }));
    }

    return NextResponse.json({ recog, matchedFlower: matchedFlower ?? null, recommendations });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
