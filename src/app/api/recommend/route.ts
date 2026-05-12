import { NextResponse } from "next/server";
import { z } from "zod";
import { getCards, getFlowers } from "@/lib/catalog";
import type { Card, Flower } from "@/lib/types";

const schema = z.object({
  recipient: z.string().optional(),
  occasion: z.string().optional(),
  mood: z.string().optional(),
  story: z.string().optional(),
  budget: z.number().optional(),
  color: z.string().optional(),
});

// LLM 原始回傳的 JSON 結構
type LlmResult = {
  recommendations: Array<{
    cardId: string;
    score: number;
    why: string;
  }>;
};

// 最終回傳給前端的完整結構
type RecommendResponse = {
  recommendations: Array<{
    card: Card;
    score: number;
    why: string;
  }>;
};

// 本地智能備用推薦邏輯 (當未設定 API 金鑰時啟動)
function fallbackRecommend(
  input: z.output<typeof schema>,
  cards: Card[],
  flowers: Flower[]
): RecommendResponse {
  const scored = cards.map((card) => {
    let score = 50; // 基礎分
    const reasons: string[] = [];

    // 1. 場合比對
    if (input.occasion && card.tags.occasions.includes(input.occasion)) {
      score += 20;
      reasons.push(`契合「${input.occasion}」的送禮情境`);
    }

    // 2. 情緒比對
    if (input.mood && card.tags.moods.includes(input.mood)) {
      score += 25;
      reasons.push(`能傳遞「${input.mood}」的深刻心意`);
    }

    // 3. 色系比對
    if (input.color && card.tags.colors.some((c) => c.includes(input.color!))) {
      score += 15;
      reasons.push(`展現迷人的${input.color}色調`);
    }

    // 4. 預算比對
    if (typeof input.budget === "number") {
      const diff = Math.abs(card.priceTwd - input.budget);
      if (diff <= 100) {
        score += 15;
        reasons.push("價格完全符合您的理想預算");
      } else if (diff <= 300) {
        score += 5;
      }
    }

    // 5. 故事/關鍵字探勘比對與花語連結
    const cardFlowers = flowers.filter((f) => card.tags.flowers.includes(f.name));
    if (input.story) {
      for (const f of cardFlowers) {
        if (input.story.includes(f.name) || f.meanings.some((m) => input.story!.includes(m))) {
          score += 30;
          reasons.push(`特別選用「${f.name}」（花語：${f.meanings.join("、")}），精準呼應您的故事`);
          break;
        }
      }
    } else if (cardFlowers.length > 0) {
      const f = cardFlowers[0];
      reasons.push(`融入「${f.name}」象徵的${f.meanings[0] ?? "祝福"}`);
    }

    // 根據狀態微調
    if (card.status === "available") score += 5;
    if (card.status === "sold") score -= 10;

    // 組合成一段溫暖流暢的文字理由
    const textWhy = reasons.length > 0
      ? `這份作品${reasons.join("，且")}。希望能為${input.recipient ?? "收禮人"}帶來最美好的感動！`
      : "整體風格優雅細膩，非常適合用來表達真摯的心意與祝福。";

    return {
      card,
      score: Math.min(score, 98),
      why: textWhy,
    };
  });

  // 排序並取前三名
  scored.sort((a, b) => b.score - a.score);
  return { recommendations: scored.slice(0, 3) };
}

// 輔助函式：將 LLM 回傳的 cardId 映射回完整 card 物件
function populateRecommendations(
  llmRes: LlmResult,
  cards: Card[]
): RecommendResponse {
  const populated = (llmRes.recommendations ?? [])
    .map((item) => {
      const card = cards.find((c) => c.id === item.cardId);
      if (!card) return null;
      return {
        card,
        score: item.score ?? 85,
        why: item.why ?? "風格優雅，契合您的心意。",
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return { recommendations: populated };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { recipient, occasion, mood, story, budget, color } = parsed.data;
    const [cards, flowers] = await Promise.all([getCards(), getFlowers()]);

    const apiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    // 簡化供給 LLM 參考的卡片目錄資訊以節省 Token
    const catalogContext = cards.map((c) => ({
      id: c.id,
      title: c.title,
      priceTwd: c.priceTwd,
      status: c.status,
      tags: c.tags,
      flowers: c.tags.flowers.map(
        (fname) => flowers.find((f) => f.name === fname)?.meanings.join("、") ?? ""
      ),
    }));

    // 若有 Gemini API Key 則呼叫 Gemini
    if (apiKey) {
      const prompt = `
你是一位專業且充滿溫度的花藝與禮品推薦顧問。請務必全程使用「繁體中文（台灣）」撰寫內容。請根據顧客提供的需求與故事，從我們的作品目錄中挑選出最適合的 3 張卡片/作品，並為每一項寫出專屬、動人且具說服力的繁體中文推薦理由。

顧客輸入資訊：
- 自由描述故事/情境：${story || "無"}
- 送禮對象：${recipient || "無"}
- 偏好場合：${occasion || "不限"}
- 期望情緒/氛圍：${mood || "不限"}
- 預算上限：${budget ? `${budget} 元` : "不限"}
- 偏好色系：${color || "不限"}

可用作品目錄 (JSON)：
${JSON.stringify(catalogContext, null, 2)}

請務必回傳以下 JSON 格式的物件，且不要包含任何 Markdown 標籤 (如 \`\`\`json)：
{
  "recommendations": [
    {
      "cardId": "卡片ID",
      "score": 95, // 契合度評分 (0-100)
      "why": "根據顧客的...故事，這張卡片選用...花材，象徵...，非常適合送給..."
    }
  ]
}
`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.7,
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          try {
            const result = JSON.parse(textContent) as LlmResult;
            if (result?.recommendations?.length) {
              const populated = populateRecommendations(result, cards);
              if (populated.recommendations.length > 0) {
                return NextResponse.json(populated);
              }
            }
          } catch (e) {
            console.error("Failed to parse Gemini JSON output", e);
          }
        }
      }
    }

    // 若有 OpenAI API Key 則呼叫 OpenAI
    if (openAiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "你是一位專業且充滿溫度的花藝顧問。請務必全程使用「繁體中文（台灣）」撰寫推薦理由。請根據顧客需求推薦3款最合適的作品，並輸出符合指定格式的 JSON 結構。JSON 格式為：{\"recommendations\": [{\"cardId\": \"...\", \"score\": 95, \"why\": \"請用繁體中文寫下動人的推薦理由...\"}]}",
            },
            {
              role: "user",
              content: `顧客需求：故事=${story || "無"}, 對象=${recipient || "無"}, 場合=${occasion || "無"}, 情緒=${mood || "無"}, 預算=${budget || "無"}, 色系=${color || "無"}。\n\n可用目錄：${JSON.stringify(catalogContext)}`,
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const textContent = data.choices?.[0]?.message?.content;
        if (textContent) {
          try {
            const result = JSON.parse(textContent) as LlmResult;
            if (result?.recommendations?.length) {
              const populated = populateRecommendations(result, cards);
              if (populated.recommendations.length > 0) {
                return NextResponse.json(populated);
              }
            }
          } catch (e) {
            console.error("Failed to parse OpenAI JSON output", e);
          }
        }
      }
    }

    // 嘗試呼叫本地 Ollama 服務 (確保本地隱私執行)
    try {
      const ollamaHost = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
      let ollamaModel = process.env.OLLAMA_MODEL;

      // 若未指定環境變數，動態偵測本機 Ollama 已下載安裝的實際模型清單
      if (!ollamaModel) {
        const tagsRes = await fetch(`${ollamaHost}/api/tags`, {
          signal: AbortSignal.timeout(3000),
        }).catch(() => null);

        if (tagsRes?.ok) {
          const tagsData = await tagsRes.json();
          const installed = tagsData?.models?.map((m: any) => m.name) || [];
          
          // 根據使用者明確指定，絕對優先調用高效能大腦 gemma4:e4b
          ollamaModel =
            installed.find((n: string) => n.includes("gemma4:e4b")) ||
            installed.find((n: string) => n.includes("gemma4")) ||
            installed.find((n: string) => n.includes("gemma2")) ||
            installed[0] ||
            "gemma4:e4b";
        } else {
          ollamaModel = "gemma4:e4b";
        }
      }

      console.log(`[Ollama Engine] Selecting local model: ${ollamaModel}`);

      const res = await fetch(`${ollamaHost}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [
            {
              role: "system",
              content:
                "你是一位專業且充滿溫度的花藝顧問。請務必全程使用「繁體中文（台灣）」撰寫推薦理由。請根據顧客需求推薦3款最合適的作品，並輸出符合指定格式的 JSON 結構。JSON 格式為：{\"recommendations\": [{\"cardId\": \"...\", \"score\": 95, \"why\": \"請用繁體中文寫下動人的推薦理由...\"}]}",
            },
            {
              role: "user",
              content: `顧客需求：故事=${story || "無"}, 對象=${recipient || "無"}, 場合=${occasion || "無"}, 情緒=${mood || "無"}, 預算=${budget || "無"}, 色系=${color || "無"}。\n\n可用目錄：${JSON.stringify(catalogContext)}`,
            },
          ],
          format: "json",
          stream: false,
          options: {
            temperature: 0.7,
          },
        }),
        // 放寬超時至 45 秒，確保本地首次冷啟動大模型載入記憶體時有充足時間完成推論
        signal: AbortSignal.timeout(45000),
      }).catch(() => null);

      if (res?.ok) {
        const data = await res.json();
        const textContent = data.message?.content;
        if (textContent) {
          try {
            const result = JSON.parse(textContent) as LlmResult;
            if (result?.recommendations?.length) {
              const populated = populateRecommendations(result, cards);
              if (populated.recommendations.length > 0) {
                // 回傳時額外附帶推論引擎標記，方便驗證
                return NextResponse.json({
                  ...populated,
                  engine: `Ollama (${ollamaModel})`,
                });
              }
            }
          } catch (e) {
            console.error("Failed to parse Ollama JSON output", e);
          }
        }
      } else {
        console.warn(`[Ollama Engine] API returned status ${res?.status}`);
      }
    } catch (err) {
      console.error("Ollama fallback check failed or timed out", err);
    }

    // 若未設定 API 金鑰、Ollama 未啟動或 LLM 解析失敗，採用本地高質感備用邏輯
    const fallbackResult = fallbackRecommend(parsed.data, cards, flowers);
    return NextResponse.json({
      ...fallbackResult,
      engine: "Local Fallback Algorithm",
    });
  } catch (error) {
    console.error("Recommend API Error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
