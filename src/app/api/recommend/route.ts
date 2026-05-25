import { NextResponse } from "next/server";
import { z } from "zod";
import type { Card } from "@/lib/types";
import {
  getFlowerCatalog,
  scoreCatalogLocally,
  toPublicCard,
  validateRecommendInput,
  type CatalogCard,
} from "@/lib/flowerRecommend";

const schema = z.object({
  recipient: z.string().optional(),
  occasion: z.string().optional(),
  mood: z.string().optional(),
  story: z.string().optional(),
  budget: z.number().optional(),
  color: z.string().optional(),
});

type LlmResult = {
  recommendations: Array<{
    cardId: string;
    score: number;
    why: string;
  }>;
};

type RecommendResponse = {
  recommendations: Array<{
    card: Card;
    score: number;
    why: string;
  }>;
  engine?: string;
};

const LLM_TOP_K = 20;

function summarizeCardForLlm(c: CatalogCard) {
  return {
    id: c.id,
    title: c.title,
    priceTwd: c.priceTwd,
    status: c.status,
    flowers: c.tags.flowers,
    occasions: c.tags.occasions,
    moods: c.tags.moods,
    colors: c.tags.colors,
    blurb: (c.blurb ?? "").slice(0, 220),
  };
}

function populateFromLlm(
  llmRes: LlmResult,
  allowed: Map<string, CatalogCard>
): RecommendResponse["recommendations"] {
  return (llmRes.recommendations ?? [])
    .map((item) => {
      const raw = allowed.get(item.cardId);
      if (!raw) return null;
      return {
        card: toPublicCard(raw),
        score: Math.min(98, Math.max(1, Math.round(item.score ?? 88))),
        why: item.why ?? "與您的情境敘述相契合。",
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
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

    const input = parsed.data;
    if (!validateRecommendInput(input)) {
      return NextResponse.json(
        {
          error: "empty_input",
          message:
            "請在右側填寫至少一項條件（對象、場合、情緒、預算或色調），或於左側輸入敘述後按 Enter 自動填入。",
        },
        { status: 400 }
      );
    }

    const data = getFlowerCatalog();
    const localRanked = scoreCatalogLocally(input, data);
    const topPool = localRanked.slice(0, LLM_TOP_K);
    const allowed = new Map(topPool.map(({ card }) => [card.id, card]));

    const localTop3: RecommendResponse = {
      recommendations: localRanked.slice(0, 3).map(({ card, score, why }) => ({
        card: toPublicCard(card),
        score,
        why,
      })),
      engine: "TextMining",
    };

    /** 預設僅本機文字探勘；設 RECOMMEND_USE_LLM=1 才呼叫 Gemini / OpenAI / Ollama */
    if (process.env.RECOMMEND_USE_LLM !== "1") {
      return NextResponse.json(localTop3);
    }

    const catalogContext = topPool.map(({ card }) => summarizeCardForLlm(card));

    const story = input.story ?? "";
    const promptUser = `顧客需求：故事=${story || "無"}, 對象=${input.recipient || "無"}, 場合=${input.occasion || "無"}, 情緒=${input.mood || "無"}, 預算=${input.budget ?? "無"}, 色系=${input.color || "無"}。

候選作品（僅能從以下 id 中挑選 3 個 cardId，不得捏造 id）：
${JSON.stringify(catalogContext, null, 2)}`;

    const apiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      const prompt = `
你是一位專業且充滿溫度的花藝與禮品推薦顧問。請務必全程使用「繁體中文（台灣）」撰寫內容。
以下「候選作品」已經由本地文字探勘粗排，請從中精選最適合的 3 張，且 **cardId 必須完全來自候選清單**。

${promptUser}

請務必回傳以下 JSON 格式的物件，且不要包含任何 Markdown 標籤：
{
  "recommendations": [
    {
      "cardId": "卡片ID",
      "score": 95,
      "why": "繁體中文推薦理由"
    }
  ]
}
`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.65,
            },
          }),
        }
      );

      if (res.ok) {
        const dataGem = await res.json();
        const textContent = dataGem.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          try {
            const result = JSON.parse(textContent) as LlmResult;
            const populated = populateFromLlm(result, allowed);
            if (populated.length >= 3) {
              return NextResponse.json({
                recommendations: populated.slice(0, 3),
                engine: "TextMining+Gemini",
              });
            }
            if (populated.length > 0) {
              const merged = [
                ...populated,
                ...localTop3.recommendations.filter(
                  (r) => !populated.some((p) => p.card.id === r.card.id)
                ),
              ].slice(0, 3);
              return NextResponse.json({
                recommendations: merged,
                engine: "TextMining+Gemini(partial)",
              });
            }
          } catch (e) {
            console.error("Failed to parse Gemini JSON output", e);
          }
        }
      }
    }

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
                "你是一位專業且充滿溫度的花藝顧問。請務必全程使用「繁體中文（台灣）」撰寫推薦理由。候選作品 JSON 中的 id 即 cardId。請輸出 {\"recommendations\": [{\"cardId\": \"...\", \"score\": 95, \"why\": \"...\"}]}，且 cardId 必須來自候選清單。",
            },
            { role: "user", content: promptUser },
          ],
        }),
      });

      if (res.ok) {
        const dataOa = await res.json();
        const textContent = dataOa.choices?.[0]?.message?.content;
        if (textContent) {
          try {
            const result = JSON.parse(textContent) as LlmResult;
            const populated = populateFromLlm(result, allowed);
            if (populated.length >= 3) {
              return NextResponse.json({
                recommendations: populated.slice(0, 3),
                engine: "TextMining+OpenAI",
              });
            }
            if (populated.length > 0) {
              const merged = [
                ...populated,
                ...localTop3.recommendations.filter(
                  (r) => !populated.some((p) => p.card.id === r.card.id)
                ),
              ].slice(0, 3);
              return NextResponse.json({
                recommendations: merged,
                engine: "TextMining+OpenAI(partial)",
              });
            }
          } catch (e) {
            console.error("Failed to parse OpenAI JSON output", e);
          }
        }
      }
    }

    try {
      const ollamaHost = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
      let ollamaModel = process.env.OLLAMA_MODEL;

      if (!ollamaModel) {
        const tagsRes = await fetch(`${ollamaHost}/api/tags`, {
          signal: AbortSignal.timeout(3000),
        }).catch(() => null);

        if (tagsRes?.ok) {
          const tagsData = await tagsRes.json();
          const installed = tagsData?.models?.map((m: { name: string }) => m.name) || [];
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

      const res = await fetch(`${ollamaHost}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [
            {
              role: "system",
              content:
                "你是一位花藝顧問。請用繁體中文（台灣）。請輸出 JSON：{\"recommendations\": [{\"cardId\": \"...\", \"score\": 90, \"why\": \"...\"}]}。cardId 必須來自使用者提供的候選清單。",
            },
            { role: "user", content: promptUser },
          ],
          format: "json",
          stream: false,
          options: { temperature: 0.65 },
        }),
        signal: AbortSignal.timeout(45000),
      }).catch(() => null);

      if (res?.ok) {
        const dataOl = await res.json();
        const textContent = dataOl.message?.content;
        if (textContent) {
          try {
            const result = JSON.parse(textContent) as LlmResult;
            const populated = populateFromLlm(result, allowed);
            if (populated.length >= 3) {
              return NextResponse.json({
                recommendations: populated.slice(0, 3),
                engine: `TextMining+Ollama(${ollamaModel})`,
              });
            }
            if (populated.length > 0) {
              const merged = [
                ...populated,
                ...localTop3.recommendations.filter(
                  (r) => !populated.some((p) => p.card.id === r.card.id)
                ),
              ].slice(0, 3);
              return NextResponse.json({
                recommendations: merged,
                engine: `TextMining+Ollama(${ollamaModel},partial)`,
              });
            }
          } catch (e) {
            console.error("Failed to parse Ollama JSON output", e);
          }
        }
      }
    } catch (err) {
      console.error("Ollama check failed or timed out", err);
    }

    return NextResponse.json(localTop3);
  } catch (error) {
    console.error("Recommend API Error:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("flowerCatalog")) {
      return NextResponse.json(
        { error: "catalog_missing", message: msg },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
