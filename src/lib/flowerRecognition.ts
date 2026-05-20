import { sampleFlowers } from "./sampleData";

type RecognitionResult = {
  name: string;
  confidence: number;
  engine: string;
};

// 嘗試呼叫外部辨識服務，若未設定則回傳模擬結果
export async function recognizeFlowerFromBuffer(buf: Buffer): Promise<RecognitionResult> {
  const apiUrl = process.env.FLOWER_RECOGNITION_API_URL;
  const apiKey = process.env.FLOWER_RECOGNITION_API_KEY;

  if (apiUrl) {
    try {
      const form = new FormData();
      // Buffer 在 TS 中未直接被視為 ArrayBufferView，將其包成 Uint8Array 可滿足 BlobPart 的型別
      form.append("image", new Blob([new Uint8Array(buf)]), "upload.jpg");

      const headers: Record<string, string> = {};
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const res = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: form as any,
      });

      if (res.ok) {
        const data = await res.json();
        // 期望外部 API 回傳 { name: "玫瑰", confidence: 0.92 }
        if (data?.name) {
          return {
            name: String(data.name),
            confidence: typeof data.confidence === "number" ? data.confidence : 0.8,
            engine: `external:${apiUrl}`,
          };
        }
      }
    } catch (err) {
      console.warn("Flower recognition external API failed", err);
    }
  }

  // fallback: 從 sampleFlowers 隨機挑一個當作模擬辨識結果
  const pick = sampleFlowers[Math.floor(Math.random() * sampleFlowers.length)];
  return {
    name: pick.name,
    confidence: 0.7 + Math.random() * 0.25,
    engine: "fallback:sampleData",
  };
}

export type { RecognitionResult };
