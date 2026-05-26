import { NextResponse } from "next/server";
import { z } from "zod";
import type { Card } from "@/lib/types";
import {
  getFlowerCatalog,
  scoreCatalogLocally,
  toPublicCard,
  validateRecommendInput,
  type CatalogCard,
  type RecommendInput,
} from "@/lib/flowerRecommend";
import {
  coerceFieldsFromStory,
  type ParsedStoryFields,
} from "@/lib/parseStoryRules";
import {
  analyzeStoryWithOllama,
  assertOllamaAvailable,
  isPlaceholderWhy,
  LlmParseError,
  LlmUnavailableError,
  recommendWithOllama,
  type CandidateSummary,
} from "@/lib/recommendOllama";

const baseFieldsSchema = z.object({
  recipient: z.string().optional(),
  occasion: z.string().optional(),
  mood: z.string().optional(),
  story: z.string().optional(),
  budget: z.number().optional(),
  color: z.string().optional(),
  flowerMeaning: z.string().optional(),
});

const requestSchema = baseFieldsSchema.extend({
  mode: z.enum(["analyze", "refine"]),
});

const LLM_TOP_K = 8;
const TARGET_RECOMMENDATIONS = 3;
const MIN_RECOMMENDATIONS = 1;

function summarizeCardForLlm(c: CatalogCard): CandidateSummary {
  return {
    id: c.id,
    title: c.title,
    priceTwd: c.priceTwd,
    flowers: c.tags.flowers.slice(0, 4),
    occasions: c.tags.occasions.slice(0, 3),
    moods: c.tags.moods.slice(0, 3),
    colors: c.tags.colors.slice(0, 3),
    blurb: (c.blurb ?? "").slice(0, 80),
  };
}

type PublicRecommendation = { card: Card; score: number; why: string };

function sortRecommendationsByScore(
  recs: PublicRecommendation[]
): PublicRecommendation[] {
  return [...recs].sort((a, b) => b.score - a.score);
}

function normalizeOccasionForScoring(occasion?: string) {
  const o = occasion?.trim();
  if (!o) return undefined;
  if (o === "傷病") return "日常";
  return o;
}

function normalizeMoodForScoring(mood?: string) {
  const m = mood?.trim();
  if (!m) return undefined;
  if (m === "療癒") return "祝福";
  if (m === "感謝") return "祝福";
  return m;
}

function populateRecommendations(
  llmItems: Array<{ cardId: string; score: number; why: string }>,
  allowed: Map<string, CatalogCard>
): PublicRecommendation[] {
  return llmItems
    .map((item) => {
      const raw = allowed.get(item.cardId);
      if (!raw) return null;
      return {
        card: toPublicCard(raw),
        score: Math.min(98, Math.max(1, Math.round(item.score ?? 88))),
        why:
          item.why?.trim() && !isPlaceholderWhy(item.why)
            ? item.why.trim()
            : "依您的送禮情境，這張作品最貼近需求。",
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/** LLM 回傳不足時，以文字探勘粗排結果補滿（最多 3 張，至少 1 張） */
function mergeWithLocalFallback(
  llmRecs: PublicRecommendation[],
  localRanked: ReturnType<typeof scoreCatalogLocally>,
  max = TARGET_RECOMMENDATIONS
): { recommendations: PublicRecommendation[]; supplemented: boolean } {
  const seen = new Set<string>();
  const out: PublicRecommendation[] = [];

  for (const r of llmRecs) {
    if (seen.has(r.card.id)) continue;
    seen.add(r.card.id);
    out.push(r);
    if (out.length >= max) {
      return { recommendations: out, supplemented: false };
    }
  }

  const llmCount = out.length;

  for (const { card, score, why } of localRanked) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    out.push({
      card: toPublicCard(card),
      score,
      why: llmCount > 0 ? `${why}（依條件比對補充推薦）` : why,
    });
    if (out.length >= max) break;
  }

  const supplemented = out.length > llmCount;
  return { recommendations: out, supplemented };
}

function buildAllowedMap(
  pools: Array<Array<{ card: CatalogCard }>>
): Map<string, CatalogCard> {
  const allowed = new Map<string, CatalogCard>();
  for (const pool of pools) {
    for (const { card } of pool) {
      allowed.set(card.id, card);
    }
  }
  return allowed;
}

function finalizeRecommendations(
  model: string,
  fromLlm: PublicRecommendation[],
  supplemented: boolean,
  aiCallCount = 1
) {
  const aiCount = fromLlm.length;
  const suffix =
    aiCount >= TARGET_RECOMMENDATIONS && !supplemented
      ? `,${aiCount}張AI`
      : supplemented
        ? `,${aiCount}張AI+補位`
        : "";
  const calls = aiCallCount > 1 ? `,${aiCallCount}次呼叫` : "";

  const engine = supplemented
    ? `Ollama(${model})+條件比對${suffix}${calls}`
    : fromLlm.length > 0
      ? `Ollama(${model})${suffix}${calls}`
      : `條件比對`;

  return { engine, aiRecommendationCount: aiCount };
}

/** analyze：粗排 → 單次 Ollama（欄位+推薦）→ 二次粗排補位 */
async function runAnalyzePipeline(story: string): Promise<{
  fields: ParsedStoryFields;
  recommendations: PublicRecommendation[];
  engine: string;
  aiRecommendationCount: number;
}> {
  const model = await assertOllamaAvailable();
  const data = getFlowerCatalog();

  const storyRanked = scoreCatalogLocally({ story }, data);
  const storyPool = storyRanked.slice(0, LLM_TOP_K);
  const candidates = storyPool.map(({ card }) => summarizeCardForLlm(card));

  let fields: ParsedStoryFields;
  let llmItems: Array<{ cardId: string; score: number; why: string }> = [];

  let aiCallCount = 1;
  try {
    const analyzed = await analyzeStoryWithOllama(story, candidates);
    fields = analyzed.fields;
    llmItems = analyzed.recommendations;
    aiCallCount = analyzed.aiCallCount;
  } catch (error) {
    if (!(error instanceof LlmParseError)) throw error;
    fields = { };
    llmItems = [];
  }

  const input: RecommendInput = {
    story,
    recipient: fields.recipient,
    occasion: normalizeOccasionForScoring(fields.occasion),
    mood: normalizeMoodForScoring(fields.mood),
    budget: fields.budget,
    color: fields.color,
    flowerMeaning: fields.flowerMeaning,
  };

  const fullRanked = scoreCatalogLocally(input, data);
  const fullPool = fullRanked.slice(0, LLM_TOP_K);
  const allowed = buildAllowedMap([storyPool, fullPool]);

  const fromLlm = populateRecommendations(llmItems, allowed);
  const { recommendations, supplemented } = mergeWithLocalFallback(
    fromLlm,
    fullRanked
  );

  if (recommendations.length < MIN_RECOMMENDATIONS) {
    throw new LlmParseError("無法產生推薦結果");
  }

  const sorted = sortRecommendationsByScore(recommendations).slice(
    0,
    TARGET_RECOMMENDATIONS
  );

  const { engine, aiRecommendationCount } = finalizeRecommendations(
    model,
    fromLlm,
    supplemented,
    aiCallCount
  );

  return {
    fields: coerceFieldsFromStory(story, fields),
    recommendations: sorted,
    engine,
    aiRecommendationCount,
  };
}

async function runRecommendPipeline(input: RecommendInput) {
  const model = await assertOllamaAvailable();
  const data = getFlowerCatalog();
  const localRanked = scoreCatalogLocally(
    {
      ...input,
      occasion: normalizeOccasionForScoring(input.occasion),
      mood: normalizeMoodForScoring(input.mood),
    },
    data
  );
  const topPool = localRanked.slice(0, LLM_TOP_K);
  const allowed = new Map(topPool.map(({ card }) => [card.id, card]));
  const candidates = topPool.map(({ card }) => summarizeCardForLlm(card));

  let llmItems: Array<{ cardId: string; score: number; why: string }> = [];
  try {
    const llmResult = await recommendWithOllama(input, candidates);
    llmItems = llmResult.recommendations;
  } catch (error) {
    if (!(error instanceof LlmParseError)) throw error;
  }

  const fromLlm = populateRecommendations(llmItems, allowed);
  const { recommendations, supplemented } = mergeWithLocalFallback(
    fromLlm,
    topPool
  );

  if (recommendations.length < MIN_RECOMMENDATIONS) {
    throw new LlmParseError("無法產生推薦結果");
  }

  const sorted = sortRecommendationsByScore(recommendations).slice(
    0,
    TARGET_RECOMMENDATIONS
  );

  const { engine, aiRecommendationCount } = finalizeRecommendations(
    model,
    fromLlm,
    supplemented,
    1
  );

  return {
    recommendations: sorted,
    engine,
    aiRecommendationCount,
  };
}

function llmErrorResponse(error: unknown) {
  if (error instanceof LlmUnavailableError) {
    return NextResponse.json(
      {
        error: "llm_unavailable",
        message: error.message,
      },
      { status: 503 }
    );
  }
  if (error instanceof LlmParseError) {
    return NextResponse.json(
      {
        error: "llm_parse_failed",
        message: error.message,
      },
      { status: 502 }
    );
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { mode, ...fields } = parsed.data;

    if (mode === "analyze") {
      const story = fields.story?.trim();
      if (!story) {
        return NextResponse.json(
          { error: "missing_story", message: "請先輸入左側情境描述" },
          { status: 400 }
        );
      }

      try {
        const result = await runAnalyzePipeline(story);

        return NextResponse.json({
          fields: result.fields,
          recommendations: result.recommendations,
          engine: result.engine,
          aiRecommendationCount: result.aiRecommendationCount,
        });
      } catch (error) {
        const llmRes = llmErrorResponse(error);
        if (llmRes) return llmRes;
        throw error;
      }
    }

    const input: RecommendInput = {
      recipient: fields.recipient,
      occasion: fields.occasion,
      mood: fields.mood,
      story: fields.story,
      budget: fields.budget,
      color: fields.color,
      flowerMeaning: fields.flowerMeaning,
    };

    if (!validateRecommendInput(input)) {
      return NextResponse.json(
        {
          error: "empty_input",
          message:
            "請在右側填寫至少一項條件（對象、場合、情緒、花語、預算或色調），或先完成 AI 分析。",
        },
        { status: 400 }
      );
    }

    try {
      const { recommendations, engine } = await runRecommendPipeline(input);
      return NextResponse.json({ recommendations, engine });
    } catch (error) {
      const llmRes = llmErrorResponse(error);
      if (llmRes) return llmRes;
      throw error;
    }
  } catch (error) {
    console.error("Recommend API Error:", error);
    const llmRes = llmErrorResponse(error);
    if (llmRes) return llmRes;
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
