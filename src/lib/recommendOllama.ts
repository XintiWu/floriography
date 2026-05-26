import { z } from "zod";
import { extractJsonObject } from "@/lib/llmJson";
import {
  MOOD_OPTIONS,
  OCCASION_OPTIONS,
  coerceFieldsFromStory,
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

const recommendationItemSchema = z.object({
  cardId: z.string(),
  score: z.number(),
  why: z.string().optional(),
});

const RECOMMEND_SCHEMA = z.object({
  recommendations: z.array(recommendationItemSchema),
});

const ANALYZE_SCHEMA = PARSE_SCHEMA.extend({
  recommendations: z.array(recommendationItemSchema),
});

const DEFAULT_WHY = "依您的送禮情境，這張作品最貼近需求。";

export function isPlaceholderWhy(why: string): boolean {
  const t = why.trim();
  if (!t) return true;
  if (/^[.．…\-—_~～]+$/.test(t)) return true;
  if (t === "..." || t === "…" || t === "無" || t === "N/A" || t === "n/a") return true;
  return false;
}

function normalizeWhy(why: unknown, fallback = DEFAULT_WHY): string {
  const text = typeof why === "string" ? why.trim() : String(why ?? "").trim();
  if (isPlaceholderWhy(text)) return fallback;
  return text || fallback;
}

export type CandidateSlotMaps = {
  slotToUuid: Map<number, string>;
  uuidToSlot: Map<string, number>;
};

/** 候選改用 1..N 編號，小模型較能穩定回傳 3 張 */
export function buildCandidateSlotMaps(
  candidates: CandidateSummary[]
): CandidateSlotMaps {
  const slotToUuid = new Map<number, string>();
  const uuidToSlot = new Map<string, number>();
  candidates.forEach((c, i) => {
    const n = i + 1;
    slotToUuid.set(n, c.id);
    uuidToSlot.set(c.id, n);
  });
  return { slotToUuid, uuidToSlot };
}

function compactCandidatesForPrompt(
  candidates: CandidateSummary[],
  slots: CandidateSlotMaps
) {
  return candidates.map((c) => {
    const n = slots.uuidToSlot.get(c.id) ?? 0;
    return {
      n,
      t: c.title,
      p: c.priceTwd,
      f: c.flowers.slice(0, 3).join(","),
      o: c.occasions.slice(0, 2).join(","),
      m: c.moods.slice(0, 2).join(","),
    };
  });
}

function resolveCardId(
  rawId: string,
  allowedIds: string[],
  slots: CandidateSlotMaps
): string | null {
  const id = rawId.trim();
  if (!id) return null;

  const slotNum = Number(id);
  if (Number.isInteger(slotNum) && slotNum >= 1 && slots.slotToUuid.has(slotNum)) {
    return slots.slotToUuid.get(slotNum)!;
  }

  const allowed = new Set(allowedIds);
  if (allowed.has(id)) return id;
  const byPrefix = allowedIds.filter((x) => x.startsWith(id) || id.startsWith(x));
  if (byPrefix.length === 1) return byPrefix[0]!;
  return null;
}

function pickValidRecommendations(
  items: Array<{ cardId: string; score: number; why: string }>,
  allowedIds: string[],
  slots: CandidateSlotMaps,
  max = 3
): Array<{ cardId: string; score: number; why: string }> {
  const seen = new Set<string>();
  const valid: Array<{ cardId: string; score: number; why: string }> = [];
  for (const r of items) {
    const cardId = resolveCardId(r.cardId, allowedIds, slots);
    if (!cardId || seen.has(cardId)) continue;
    seen.add(cardId);
    valid.push({ cardId, score: r.score, why: normalizeWhy(r.why) });
    if (valid.length >= max) break;
  }
  return valid;
}

function parseAnalyzeResponse(
  story: string,
  text: string,
  allowedIds: string[],
  slots: CandidateSlotMaps,
  pickCount: number
): {
  fields: ParsedStoryFields;
  recommendations: Array<{ cardId: string; score: number; why: string }>;
} {
  const raw = extractJsonObject(text) as Record<string, unknown>;
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
  const sanitized = sanitizeParsedFields({
    ...rest,
    budget: budget ?? undefined,
    flowerMeaning: flowerMeaning?.trim() || undefined,
  });
  const fields = coerceFieldsFromStory(story, sanitized);

  const validRecs = pickValidRecommendations(
    parsed.data.recommendations,
    allowedIds,
    slots,
    pickCount
  );

  return { fields, recommendations: validRecs };
}

const ANALYZE_SYSTEM = (pickCount: number) =>
  `你是禮品情境解析與花藝推薦助手。繁體中文（台灣）。
任務A：從送禮描述抽出欄位。recipient 必填：原文提到的送禮對象短詞（如摯友、媽媽、同事）；occasion 僅能：${OCCASION_OPTIONS.join("、")} 或空字串；mood 僅能：${MOOD_OPTIONS.join("、")} 或空字串。
若原文未提到預算則 budget 必須 null；未提到色調則 color 必須空字串；未提到花語／心意則 flowerMeaning 必須空字串。勿從候選卡價格推測預算。
任務B：從候選清單選 exactly ${pickCount} 張，使用候選的 n 整數（1~${pickCount}）作為 cardId，三張 n 不可重複。
每張 recommendations 的 why 必填、40 字內繁體中文理由；需符合收禮關係語境（若對象是家人/朋友/同事，避免使用「愛情/戀愛/情人」等字眼；除非原文明確是戀人/老婆/老公）。
score 為 85~98 整數。
只回 JSON，勿 markdown：
{"recipient":"","occasion":"","mood":"","budget":null,"color":"","flowerMeaning":"","recommendations":[{"cardId":"1","score":92,"why":"..."},{"cardId":"2","score":88,"why":"..."},{"cardId":"3","score":85,"why":"..."}]}`;

const RECOMMEND_RETRY_SYSTEM = (pickCount: number, need: number) =>
  `你是花藝顧問。繁體中文。從候選選 exactly ${need} 張，cardId 必須是候選的 n（1~${pickCount}），不可重複。每張 why 必填 20~40 字繁中，禁止只寫「...」或省略號。
只回 JSON：{"recommendations":[{"cardId":"1","score":90,"why":"具體理由"}]}`;

const WHY_RETRY_SYSTEM = `你是花藝顧問。繁體中文。使用者已選定卡片編號 n，請只為每張撰寫 why（20~40 字），說明為何適合送禮情境。需符合收禮關係語境（若對象是家人/朋友/同事，避免使用「愛情/戀愛/情人」等字眼；除非原文明確是戀人/老婆/老公）。禁止「...」或空字串。
只回 JSON：{"recommendations":[{"cardId":"1","why":"具體理由"}]}`;

function parseRecommendationItems(
  raw: { recommendations?: Array<Record<string, unknown>> }
): Array<{ cardId: string; score: number; why: string }> {
  return (raw?.recommendations ?? []).map((r) => ({
    cardId: String(r.cardId ?? r.id ?? r.n ?? ""),
    score: typeof r.score === "number" ? r.score : Number(r.score) || 85,
    why: normalizeWhy(r.why ?? r.reason),
  }));
}

/** 模型常對第 2、3 張只回 "..."，另呼一次只補 why */
async function fillPlaceholderWhys(
  story: string,
  recs: Array<{ cardId: string; score: number; why: string }>,
  candidates: CandidateSummary[],
  slots: CandidateSlotMaps,
  allowedIds: string[],
  model: string
): Promise<{
  recs: Array<{ cardId: string; score: number; why: string }>;
  extraCalls: number;
}> {
  const bad = recs.filter((r) => isPlaceholderWhy(r.why));
  if (bad.length === 0) return { recs, extraCalls: 0 };

  const compact = compactCandidatesForPrompt(candidates, slots);
  const retryUser = `送禮描述：\n${story.trim()}\n\n已選卡片（請為每個 n 寫 why，cardId 填 n）：\n${JSON.stringify(
    bad.map((r) => ({ n: slots.uuidToSlot.get(r.cardId), score: r.score }))
  )}\n\n候選：\n${JSON.stringify(compact)}`;

  const retryText = await ollamaChat(WHY_RETRY_SYSTEM, retryUser, model, {
    num_predict: 360,
  });

  try {
    const retryRaw = extractJsonObject(retryText) as {
      recommendations?: Array<Record<string, unknown>>;
    };
    const items = (retryRaw?.recommendations ?? []).map((r) => ({
      cardId: String(
        (r as Record<string, unknown>).cardId ??
          (r as Record<string, unknown>).n ??
          ""
      ),
      why: normalizeWhy(
        (r as Record<string, unknown>).why ?? (r as Record<string, unknown>).reason,
        ""
      ),
    }));

    const whyByCardId = new Map<string, string>();
    for (const item of items) {
      const cardId = resolveCardId(item.cardId, allowedIds, slots);
      if (!cardId || isPlaceholderWhy(item.why)) continue;
      whyByCardId.set(cardId, item.why);
    }

    const merged = recs.map((r) => {
      const better = whyByCardId.get(r.cardId);
      if (better && isPlaceholderWhy(r.why)) return { ...r, why: better };
      if (isPlaceholderWhy(r.why)) return { ...r, why: normalizeWhy(r.why) };
      return r;
    });
    return { recs: merged, extraCalls: 1 };
  } catch {
    return {
      recs: recs.map((r) =>
        isPlaceholderWhy(r.why) ? { ...r, why: normalizeWhy(r.why) } : r
      ),
      extraCalls: 0,
    };
  }
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

/** 單次 Ollama：解析情境欄位 + 從候選選推薦（analyze 用）；不足 3 張時最多補呼一次 */
export async function analyzeStoryWithOllama(
  story: string,
  candidates: CandidateSummary[]
): Promise<{
  fields: ParsedStoryFields;
  recommendations: Array<{ cardId: string; score: number; why: string }>;
  aiCallCount: number;
}> {
  if (candidates.length < 1) {
    throw new LlmParseError("候選作品不足，無法分析");
  }

  const model = await assertOllamaAvailable();
  const pickCount = Math.min(3, candidates.length);
  const allowedIds = candidates.map((c) => c.id);
  const slots = buildCandidateSlotMaps(candidates);
  const compact = compactCandidatesForPrompt(candidates, slots);

  let aiCallCount = 0;
  const user = `送禮描述：\n${story.trim()}\n\n候選(n=編號，cardId 請填 n 的數字)：\n${JSON.stringify(compact)}`;

  const text = await ollamaChat(ANALYZE_SYSTEM(pickCount), user, model, {
    num_predict: 560,
  });
  aiCallCount += 1;

  let result: {
    fields: ParsedStoryFields;
    recommendations: Array<{ cardId: string; score: number; why: string }>;
  };
  try {
    result = parseAnalyzeResponse(story, text, allowedIds, slots, pickCount);
  } catch {
    throw new LlmParseError("無法解析 Ollama 回傳的分析 JSON");
  }

  if (pickCount >= 1) {
    const { recs, extraCalls } = await fillPlaceholderWhys(
      story,
      result.recommendations,
      candidates,
      slots,
      allowedIds,
      model
    );
    result.recommendations = recs;
    aiCallCount += extraCalls;
  }

  if (result.recommendations.length < pickCount && pickCount >= 3) {
    const need = pickCount - result.recommendations.length;
    const usedSlots = new Set(
      result.recommendations.map((r) => slots.uuidToSlot.get(r.cardId)).filter(Boolean)
    );
    const retryUser = `需求：${story.trim()}\n已選 n：${[...usedSlots].join(",") || "無"}\n再選 ${need} 張不同 n。\n候選：\n${JSON.stringify(compact)}`;
    const retryText = await ollamaChat(
      RECOMMEND_RETRY_SYSTEM(pickCount, need),
      retryUser,
      model,
      { num_predict: 280 }
    );
    aiCallCount += 1;
    try {
      const retryRaw = extractJsonObject(retryText) as {
        recommendations?: Array<Record<string, unknown>>;
      };
      const extra = pickValidRecommendations(
        parseRecommendationItems(retryRaw),
        allowedIds,
        slots,
        need
      );
      const seen = new Set(result.recommendations.map((r) => r.cardId));
      for (const r of extra) {
        if (seen.has(r.cardId)) continue;
        seen.add(r.cardId);
        result.recommendations.push(r);
        if (result.recommendations.length >= pickCount) break;
      }
    } catch {
      /* 保留首次結果 */
    }
  }

  return { ...result, aiCallCount };
}

export async function parseStoryWithOllama(story: string): Promise<ParsedStoryFields> {
  const model = await assertOllamaAvailable();
  const text = await ollamaChat(PARSE_PROMPT, story.trim(), model, { num_predict: 256 });
  const parsed = PARSE_SCHEMA.safeParse(extractJsonObject(text));
  if (!parsed.success) {
    throw new LlmParseError("無法解析 Ollama 回傳的情境欄位");
  }
  const { budget, flowerMeaning, ...rest } = parsed.data;
  const sanitized = sanitizeParsedFields({
    ...rest,
    budget: budget ?? undefined,
    flowerMeaning: flowerMeaning?.trim() || undefined,
  });
  return coerceFieldsFromStory(story, sanitized);
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
  const slots = buildCandidateSlotMaps(candidates);
  const allowedIds = candidates.map((c) => c.id);
  const system = `你是專業花藝顧問。繁體中文（台灣）。
選 exactly ${pickCount} 張，cardId 用候選 n（1~${pickCount}），不可重複。why 40字內。score 85~98。
只回 JSON：{"recommendations":[{"cardId":"1","score":90,"why":"..."}]}`;

  const user = `顧客需求：\n${formatInputForPrompt(input)}\n\n候選(n=編號)：\n${JSON.stringify(compactCandidatesForPrompt(candidates, slots))}`;

  const text = await ollamaChat(system, user, model, { num_predict: 400 });
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

  let valid = pickValidRecommendations(
    parsed.data.recommendations,
    allowedIds,
    slots,
    pickCount
  );

  if (valid.length < pickCount && pickCount >= 3) {
    const need = pickCount - valid.length;
    const retryText = await ollamaChat(
      RECOMMEND_RETRY_SYSTEM(pickCount, need),
      `需求：\n${formatInputForPrompt(input)}\n候選：\n${JSON.stringify(compactCandidatesForPrompt(candidates, slots))}`,
      model,
      { num_predict: 280 }
    );
    try {
      const retryRaw = extractJsonObject(retryText) as {
        recommendations?: Array<Record<string, unknown>>;
      };
      const extra = pickValidRecommendations(
        parseRecommendationItems(retryRaw),
        allowedIds,
        slots,
        need
      );
      const seen = new Set(valid.map((r) => r.cardId));
      for (const r of extra) {
        if (seen.has(r.cardId)) continue;
        seen.add(r.cardId);
        valid.push(r);
        if (valid.length >= pickCount) break;
      }
    } catch {
      /* keep partial */
    }
  }

  const storyText = input.story?.trim() || formatInputForPrompt(input);
  const { recs } = await fillPlaceholderWhys(
    storyText,
    valid,
    candidates,
    slots,
    allowedIds,
    model
  );

  return { recommendations: recs };
}
