import { z } from "zod";
import { extractJsonObject } from "@/lib/llmJson";
import {
  MOOD_OPTIONS,
  OCCASION_OPTIONS,
  sanitizeParsedFields,
  type ParsedStoryFields,
} from "@/lib/parseStoryRules";
import type { RecommendInput } from "@/lib/flowerRecommend";

export class LlmUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

export class LlmParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmParseError";
  }
}

const PARSE_SCHEMA = z.object({
  recipient: z.string().optional(),
  occasion: z.string().optional(),
  mood: z.string().optional(),
  budget: z.number().optional().nullable(),
  color: z.string().optional(),
  flowerMeaning: z.string().optional(),
});

const RECOMMEND_SCHEMA = z.object({
  recommendations: z.array(
    z.object({
      cardId: z.string(),
      score: z.number(),
      why: z.string(),
    })
  ),
});

const ANALYZE_SCHEMA = PARSE_SCHEMA.extend({
  recommendations: z.array(
    z.object({
      cardId: z.string(),
      score: z.number(),
      why: z.string(),
    })
  ),
});

function compactCandidates(candidates: CandidateSummary[]) {
  return candidates.map((c) => ({
    id: c.id,
    t: c.title,
    p: c.priceTwd,
    f: c.flowers.join(","),
    o: c.occasions.join(","),
    m: c.moods.join(","),
    c: c.colors.join(","),
    b: c.blurb.slice(0, 60),
  }));
}

function resolveCardId(rawId: string, allowedIds: string[]): string | null {
  const id = rawId.trim();
  if (!id) return null;
  const allowed = new Set(allowedIds);
  if (allowed.has(id)) return id;
  const byPrefix = allowedIds.filter((x) => x.startsWith(id) || id.startsWith(x));
  if (byPrefix.length === 1) return byPrefix[0]!;
  return null;
}

function pickValidRecommendations(
  items: Array<{ cardId: string; score: number; why: string }>,
  allowedIds: string[],
  max = 3
): Array<{ cardId: string; score: number; why: string }> {
  const seen = new Set<string>();
  const valid: Array<{ cardId: string; score: number; why: string }> = [];
  for (const r of items) {
    const cardId = resolveCardId(r.cardId, allowedIds);
    if (!cardId || seen.has(cardId)) continue;
    seen.add(cardId);
    valid.push({ cardId, score: r.score, why: r.why });
    if (valid.length >= max) break;
  }
  return valid;
}

function parseRecommendationItems(
  raw: { recommendations?: Array<Record<string, unknown>> }
): Array<{ cardId: string; score: number; why: string }> {
  return (raw?.recommendations ?? []).map((r) => ({
    cardId: String(r.cardId ?? r.id ?? ""),
    score: typeof r.score === "number" ? r.score : Number(r.score) || 85,
    why: String(r.why ?? r.reason ?? ""),
  }));
}

export type CandidateSummary = {
  id: string;
  title: string;
  priceTwd: number;
  flowers: string[];
  occasions: string[];
  moods: string[];
  colors: string[];
  blurb: string;
};

const CHAT_TIMEOUT_MS = 120_000;

function getOllamaHost(): string {
  return process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
}

let resolvedModel: string | null = null;

export async function resolveOllamaModel(): Promise<string> {
  if (process.env.OLLAMA_MODEL?.trim()) {
    return process.env.OLLAMA_MODEL.trim();
  }
  if (resolvedModel) return resolvedModel;

  const host = getOllamaHost();
  const tagsRes = await fetch(`${host}/api/tags`, {
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);

  if (!tagsRes?.ok) {
    throw new LlmUnavailableError(
      `無法連線 Ollama（${host}）。請執行 ollama serve 並確認已 pull 模型。`
    );
  }

  const tagsData = await tagsRes.json();
  const installed: string[] =
    tagsData?.models?.map((m: { name: string }) => m.name) ?? [];

  if (installed.length === 0) {
    throw new LlmUnavailableError(
      "Ollama 未安裝任何模型，請先執行 ollama pull llama3.2:3b"
    );
  }

  resolvedModel =
    installed.find((n) => n === "llama3.2:3b" || n.startsWith("llama3.2:3b")) ||
    installed.find((n) => n.startsWith("llama3.2")) ||
    installed.find((n) => n.includes("gemma2")) ||
    installed.find((n) => n.includes("qwen2.5")) ||
    installed.find((n) => n.includes("gemma")) ||
    installed[0];

  return resolvedModel;
}

export async function assertOllamaAvailable(): Promise<string> {
  const host = getOllamaHost();
  const tagsRes = await fetch(`${host}/api/tags`, {
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);

  if (!tagsRes?.ok) {
    resolvedModel = null;
    throw new LlmUnavailableError(
      `無法連線 Ollama（${host}）。請執行 ollama serve 並確認已 pull 模型。`
    );
  }

  return resolveOllamaModel();
}

type OllamaChatOptions = {
  num_predict?: number;
};

async function ollamaChat(
  system: string,
  user: string,
  model: string,
  chatOptions: OllamaChatOptions = {}
): Promise<string> {
  const host = getOllamaHost();
  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      format: "json",
      stream: false,
      options: {
        temperature: 0.35,
        ...(chatOptions.num_predict != null
          ? { num_predict: chatOptions.num_predict }
          : {}),
      },
    }),
    signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
  }).catch(() => null);

  if (!res?.ok) {
    throw new LlmUnavailableError(
      `Ollama 請求失敗（${res?.status ?? "無回應"}）。請確認 ollama serve 正在運行。`
    );
  }

  const data = await res.json();
  const text = data?.message?.content;
  if (!text || typeof text !== "string") {
    throw new LlmParseError("Ollama 回傳內容為空");
  }
  return text;
}

const PARSE_PROMPT = `你是禮品情境解析助手。請從使用者的一段繁體中文送禮描述中，抽出結構化欄位。
occasion 只能從：${OCCASION_OPTIONS.join("、")} 或空字串。
mood 只能從：${MOOD_OPTIONS.join("、")} 或空字串。
budget 為整數新台幣或 null。
color 為簡短色名（如粉、白、黃）或空字串。
recipient 為送禮對象短詞或空字串。
flowerMeaning 為期望傳達的花語或心意關鍵字（短句，可空）。

只回傳 JSON：
{"recipient":"","occasion":"","mood":"","budget":null,"color":"","flowerMeaning":""}`;

/** 單次 Ollama：解析情境欄位 + 從候選選推薦（analyze 用） */
export async function analyzeStoryWithOllama(
  story: string,
  candidates: CandidateSummary[]
): Promise<{
  fields: ParsedStoryFields;
  recommendations: Array<{ cardId: string; score: number; why: string }>;
}> {
  if (candidates.length < 1) {
    throw new LlmParseError("候選作品不足，無法分析");
  }

  const model = await assertOllamaAvailable();
  const pickCount = Math.min(3, candidates.length);
  const allowedIds = candidates.map((c) => c.id);

  const system = `你是禮品情境解析與花藝推薦助手。請用繁體中文（台灣）。
1) 從使用者送禮描述抽出結構化欄位：
   occasion 只能從：${OCCASION_OPTIONS.join("、")} 或空字串。
   mood 只能從：${MOOD_OPTIONS.join("、")} 或空字串。
   budget 為整數新台幣或 null；color 為簡短色名；recipient 為送禮對象；flowerMeaning 為期望花語（可空）。
2) 從候選清單精選 1～${pickCount} 張 cardId（盡量選滿；id 必須完整複製候選 id，不得捏造）。
score 為 1–98 整數。why 為簡短推薦理由。
只回傳 JSON：
{"recipient":"","occasion":"","mood":"","budget":null,"color":"","flowerMeaning":"","recommendations":[{"cardId":"...","score":90,"why":"..."}]}`;

  const user = `送禮描述：\n${story.trim()}\n\n候選(JSON陣列)：\n${JSON.stringify(compactCandidates(candidates))}`;

  const text = await ollamaChat(system, user, model, { num_predict: 512 });
  let raw: Record<string, unknown>;
  try {
    raw = extractJsonObject(text) as Record<string, unknown>;
  } catch {
    throw new LlmParseError("無法解析 Ollama 回傳的分析 JSON");
  }

  const recItems = parseRecommendationItems(
    raw as { recommendations?: Array<Record<string, unknown>> }
  );
  const parsed = ANALYZE_SCHEMA.safeParse({
    recipient: raw.recipient,
    occasion: raw.occasion,
    mood: raw.mood,
    budget: raw.budget,
    color: raw.color,
    flowerMeaning: raw.flowerMeaning,
    recommendations: recItems,
  });

  if (!parsed.success) {
    throw new LlmParseError("無法解析 Ollama 回傳的情境與推薦欄位");
  }

  const { budget, flowerMeaning, ...rest } = parsed.data;
  const fields = sanitizeParsedFields({
    ...rest,
    budget: budget ?? undefined,
    flowerMeaning: flowerMeaning?.trim() || undefined,
  });

  const validRecs = pickValidRecommendations(
    parsed.data.recommendations,
    allowedIds
  );

  return { fields, recommendations: validRecs };
}

export async function parseStoryWithOllama(story: string): Promise<ParsedStoryFields> {
  const model = await assertOllamaAvailable();
  const text = await ollamaChat(PARSE_PROMPT, story.trim(), model, { num_predict: 256 });
  const parsed = PARSE_SCHEMA.safeParse(extractJsonObject(text));
  if (!parsed.success) {
    throw new LlmParseError("無法解析 Ollama 回傳的情境欄位");
  }
  const { budget, flowerMeaning, ...rest } = parsed.data;
  return sanitizeParsedFields({
    ...rest,
    budget: budget ?? undefined,
    flowerMeaning: flowerMeaning?.trim() || undefined,
  });
}

function formatInputForPrompt(input: RecommendInput): string {
  return [
    `故事=${input.story?.trim() || "無"}`,
    `對象=${input.recipient?.trim() || "無"}`,
    `場合=${input.occasion?.trim() || "無"}`,
    `情緒=${input.mood?.trim() || "無"}`,
    `花語=${input.flowerMeaning?.trim() || "無"}`,
    `預算=${input.budget ?? "無"}`,
    `色系=${input.color?.trim() || "無"}`,
  ].join("\n");
}

export async function recommendWithOllama(
  input: RecommendInput,
  candidates: CandidateSummary[]
): Promise<{ recommendations: Array<{ cardId: string; score: number; why: string }> }> {
  if (candidates.length < 1) {
    throw new LlmParseError("候選作品不足，無法推薦");
  }

  const model = await assertOllamaAvailable();
  const pickCount = Math.min(3, candidates.length);
  const system = `你是專業花藝顧問。請用繁體中文（台灣）撰寫推薦理由。
從候選清單中精選 1 至 ${pickCount} 張最適合的 cardId（盡量選滿 ${pickCount} 張；若難以判斷可少於 ${pickCount} 張）。
cardId 必須完整複製候選中的 id 字串，不得捏造或改寫。
score 為 1–98 的整數，代表契合度。
只回傳 JSON：{"recommendations":[{"cardId":"...","score":90,"why":"..."}]}`;

  const user = `顧客需求：\n${formatInputForPrompt(input)}\n\n候選(JSON陣列，id 必須從中選 1～${pickCount} 個)：\n${JSON.stringify(compactCandidates(candidates))}`;

  const text = await ollamaChat(system, user, model, { num_predict: 384 });
  let raw: { recommendations?: Array<Record<string, unknown>> };
  try {
    raw = extractJsonObject(text) as {
      recommendations?: Array<Record<string, unknown>>;
    };
  } catch {
    throw new LlmParseError("無法解析 Ollama 回傳的推薦 JSON");
  }

  const items = parseRecommendationItems(raw);
  const parsed = RECOMMEND_SCHEMA.safeParse({ recommendations: items });
  if (!parsed.success) {
    throw new LlmParseError("無法解析 Ollama 回傳的推薦結果");
  }

  const allowedIds = candidates.map((c) => c.id);
  const valid = pickValidRecommendations(parsed.data.recommendations, allowedIds);

  return { recommendations: valid };
}
