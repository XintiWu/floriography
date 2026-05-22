import { sampleFlowers } from "./sampleData";

type RecognitionResult = {
  name: string;
  confidence: number;
  engine: string;
};

// 使用 Gemini Vision API 辨識花朵，若無 API Key 則回傳模擬結果
export async function recognizeFlowerFromBuffer(
  buf: Buffer
): Promise<RecognitionResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const base64 = buf.toString("base64");

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text:
                      '請仔細觀察這張圖片中的花朵，只回傳一個花朵名稱（繁體中文）與信心值（0-1）。' +
                      '回傳 JSON 格式：{"name":"花名","confidence":0.95}。' +
                      '若圖片不含花朵，回傳 {"name":"圖片不含花朵，隨機推薦","confidence":0.0}',
                  },
                  {
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: base64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();

        const textContent =
          data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (textContent) {
          try {
            const cleaned = textContent
              .replace(/```json\s*/i, "")
              .replace(/```/g, "")
              .trim();

            const parsed = JSON.parse(cleaned);

            if (parsed?.name) {
              return {
                name: parsed.name,
                confidence: Math.max(
                  0,
                  Math.min(
                    1,
                    typeof parsed.confidence === "number"
                      ? parsed.confidence
                      : 0.8
                  )
                ),
                engine: "gemini:2.5-flash",
              };
            }
          } catch (e) {
            console.warn("Failed to parse Gemini JSON", textContent);
          }
        }
      } else {
        const err = await res.text();
        console.warn("Gemini API error:", res.status, err);
        if (res.status >= 500 && res.status < 600) {
          throw new Error("GeminiServerBusy");
        }
      }
    } catch (err) {
      console.warn("Gemini recognition failed:", err);
      if (err instanceof Error && err.message === "GeminiServerBusy") {
        throw err;
      }
    }
  }

  // fallback
  const pick =
    sampleFlowers[Math.floor(Math.random() * sampleFlowers.length)];

  return {
    name: pick.name,
    confidence: 0.7 + Math.random() * 0.25,
    engine: "fallback:sampleData",
  };
}

export type { RecognitionResult };
