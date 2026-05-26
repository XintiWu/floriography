import { z } from "zod";
import {
  extractJsonObject,
  salvageRecommendationItems,
} from "@/lib/llmJson";
import { LlmParseError, LlmUnavailableError } from "@/lib/llmErrors";
import {
  createRecommendLlm,
  type RecommendLlm,
} from "@/lib/llmProvider";
import {
  MOOD_OPTIONS,
  OCCASION_OPTIONS,
  coerceFieldsFromStory,
  sanitizeParsedFields,
  type ParsedStoryFields,
} from "@/lib/parseStoryRules";
import type { RecommendInput } from "@/lib/flowerRecommend";
import {
  applyRecommendTone,
  hasRomanticLeak,
  resolveRecommendTone,
  type RecommendToneContext,
} from "@/lib/recommendTone";

export { LlmParseError, LlmUnavailableError } from "@/lib/llmErrors";
export {
  assertLlmAvailable,
  assertOllamaAvailable,
  createRecommendLlm,
  getGeminiRecommendModel,
  getRecommendLlmProvider,
} from "@/lib/llmProvider";

const PARSE_SCHEMA = z.object({
  recipient: z.string().optional(),
  occasion: z.string().optional(),
  mood: z.string().optional(),
  budget: z.number().optional().nullable(),
  color: z.string().optional(),
  flowerMeaning: z.string().optional(),
});

const recommendationItemSchema = z.object({
  cardId: z.union([z.string(), z.number()]).transform(String),
  score: z.coerce.number(),
  why: z.union([z.string(), z.number()]).optional().transform(String).optional(),
});

const RECOMMEND_SCHEMA = z.object({
  recommendations: z.array(recommendationItemSchema),
});

const ANALYZE_SCHEMA = PARSE_SCHEMA.extend({
  consultantReply: z.string().optional(),
  highlightTerms: z.array(z.string()).optional(),
  recommendations: z.array(recommendationItemSchema),
});

const REFINE_SCHEMA = z.object({
  consultantReply: z.string().optional(),
  highlightTerms: z.array(z.string()).optional(),
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

function normalizeWhy(
  why: unknown,
  fallback = DEFAULT_WHY,
  tone?: RecommendToneContext
): string {
  const text = typeof why === "string" ? why.trim() : String(why ?? "").trim();
  if (isPlaceholderWhy(text)) return fallback;
  const base = text || fallback;
  return tone ? applyRecommendTone(base, tone) : base;
}

function toneSanitizeRecs(
  recs: Array<{ cardId: string; score: number; why: string }>,
  tone: RecommendToneContext
): Array<{ cardId: string; score: number; why: string }> {
  return recs.map((r) => ({
    ...r,
    why: applyRecommendTone(normalizeWhy(r.why, DEFAULT_WHY, tone), tone),
  }));
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
  items: Array<{ cardId: string; score: number; why?: string }>,
  allowedIds: string[],
  slots: CandidateSlotMaps,
  max = 3,
  tone?: RecommendToneContext
): Array<{ cardId: string; score: number; why: string }> {
  const seen = new Set<string>();
  const valid: Array<{ cardId: string; score: number; why: string }> = [];
  for (const r of items) {
    const cardId = resolveCardId(r.cardId, allowedIds, slots);
    if (!cardId || seen.has(cardId)) continue;
    seen.add(cardId);
    valid.push({
      cardId,
      score: r.score,
      why: normalizeWhy(r.why, DEFAULT_WHY, tone),
    });
    if (valid.length >= max) break;
  }
  return valid;
}

const CONSULTANT_STYLE_RULES = `consultantReply 寫作規範（極重要）：
- 僅能使用繁體中文，禁止任何英文單字或拼音
- 你是對「送禮的顧客」做專業花藝顧問分析，全文用「您」；禁止代寫賀卡、禁止對收禮人直呼或直接對話
- 收禮人請用第三人稱（如「您的父親」「對方」）
- 必須是 2~4 句連貫散文，禁止編號、條列、換行清單
- 禁止「親愛的顧客」「您好」等客服開場、禁止作品全名、「植物標本卡」「選擇了以下」「第1張」等推銷用語
- 必須具體點名「本店花材清單」中 2~4 種花材全名，分別說明其花語意象與為何適合此情境（專業顧問口吻，非商品清單）
- 禁止臆造清單外的花名；highlightTerms 須為 consultantReply 中出現的花材名，2~3 個，且全部來自清單`;

/** 候選池內花材（依出現頻率排序，供顧問引用） */
export function collectCandidateFlowers(candidates: CandidateSummary[]): string[] {
  const freq = new Map<string, number>();
  for (const c of candidates) {
    for (const f of c.flowers) {
      if (!f?.trim()) continue;
      freq.set(f, (freq.get(f) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

function flowersFromRecommendations(
  recommendations: Array<{ cardId: string }>,
  candidates: CandidateSummary[]
): string[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of recommendations) {
    const card = byId.get(r.cardId);
    if (!card) continue;
    for (const f of card.flowers) {
      if (seen.has(f)) continue;
      seen.add(f);
      out.push(f);
    }
  }
  return out;
}

function formatFlowerInventoryForPrompt(flowers: string[]): string {
  if (flowers.length === 0) return "";
  return `本店候選作品花材（consultantReply 與 highlightTerms 只能從此清單選用，須具體點名 2~4 種）：\n${flowers.join("、")}`;
}

function countMentionedFlowers(text: string, flowers: string[]): number {
  if (flowers.length === 0) return 0;
  return flowers.filter((f) => text.includes(f)).length;
}

function flowerMeaningHint(
  flower: string,
  candidates: CandidateSummary[]
): string {
  const escaped = flower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const c of candidates) {
    if (!c.flowers.includes(flower)) continue;
    const blurb = c.blurb || "";
    const m1 = blurb.match(
      new RegExp(`${escaped}的花語是[「「]?([^」」\\n。]+)`)
    );
    if (m1?.[1]) return m1[1].trim();
    const m2 = blurb.match(
      new RegExp(`${escaped}[^。]{0,12}象徵[「「]?([^」」\\n。]+)`)
    );
    if (m2?.[1]) return m2[1].trim();
  }
  return "";
}

function sanitizeHighlightTerms(
  terms: string[],
  inventory: string[],
  prefer: string[] = []
): string[] {
  const inv = new Set(inventory);
  const fromRaw = terms.filter((t) => inv.has(t));
  const picked: string[] = [];
  for (const f of [...prefer, ...fromRaw, ...inventory]) {
    if (!inv.has(f) || picked.includes(f)) continue;
    picked.push(f);
    if (picked.length >= 3) break;
  }
  return picked.slice(0, 3);
}

export type ConsultantBriefContext = {
  candidates?: CandidateSummary[];
  focusFlowers?: string[];
  inventory?: string[];
};

export function finalizeConsultantBrief(
  story: string,
  fields: ParsedStoryFields,
  ctx: ConsultantBriefContext & {
    rawConsultant?: string;
    rawHighlights?: string[];
  }
): { consultantReply: string; highlightTerms: string[] } {
  const inventory =
    ctx.inventory ??
    (ctx.candidates ? collectCandidateFlowers(ctx.candidates) : []);
  const focus =
    ctx.focusFlowers?.filter((f) => inventory.includes(f)) ??
    inventory.slice(0, 4);

  const rawText =
    typeof ctx.rawConsultant === "string" ? ctx.rawConsultant.trim() : "";
  const cleaned = rawText ? stripConsultantArtifacts(rawText) : "";
  const mentions = countMentionedFlowers(cleaned, inventory);

  let consultantReply = "";
  const tone = resolveRecommendTone(story, fields);

  if (
    cleaned.length >= 48 &&
    mentions >= 2 &&
    !isConsultantReplyLowQuality(cleaned, fields) &&
    (tone.romantic || !hasRomanticLeak(cleaned))
  ) {
    consultantReply = applyRecommendTone(cleaned.slice(0, 320), tone);
  } else {
    consultantReply = buildConsultantFallback(story, fields, {
      candidates: ctx.candidates,
      focusFlowers: focus.length >= 2 ? focus : inventory.slice(0, 3),
    });
    consultantReply = applyRecommendTone(consultantReply, tone);
  }

  const highlightTerms = sanitizeHighlightTerms(
    ctx.rawHighlights ?? [],
    inventory,
    flowersNamedInText(consultantReply, inventory)
  );

  return { consultantReply, highlightTerms };
}

function flowersNamedInText(text: string, inventory: string[]): string[] {
  return inventory.filter((f) => text.includes(f));
}

function isConsultantReplyLowQuality(
  text: string,
  fields: ParsedStoryFields
): boolean {
  const t = text.trim();
  if (t.length < 24) return true;

  const latin = (t.match(/[a-zA-Z]{2,}/g) || []).length;
  if (latin > 0) return true;

  const badPatterns = [
    /選擇了以下/,
    /植物標本卡/,
    /親愛的顧客/,
    /您好！/,
    /^\s*\d+[\.\)、]/m,
    /\n\s*\d+[\.\)、]/,
    /\b(dad|mom|speedy|symbol|recovery)\b/i,
    /希望你能/,
    /祝你/,
    /祝福你在/,
    /送上這些/,
    /帶給你/,
    /選了以下/,
  ];
  if (badPatterns.some((re) => re.test(t))) return true;

  const recipient = fields.recipient?.trim();
  if (recipient && t.startsWith(recipient)) return true;

  return false;
}

function stripConsultantArtifacts(text: string): string {
  return text
    .replace(/選擇了以下[\s\S]*$/i, "")
    .replace(/\n\s*\d+[\.\)、][^\n]*/g, "")
    .replace(/\d+[\.\)、]\s*[^\n。]+/g, "")
    .replace(/[a-zA-Z]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function buildConsultantFallback(
  story: string,
  fields: ParsedStoryFields,
  ctx?: { candidates?: CandidateSummary[]; focusFlowers?: string[] }
): string {
  const who = fields.recipient?.trim() || "對方";
  const meaning = fields.flowerMeaning?.trim();
  const mood = fields.mood?.trim();
  const occ = fields.occasion?.trim();
  const toneParts = [meaning, mood].filter(Boolean).join("、") || "祝福與陪伴";
  const inventory = ctx?.candidates
    ? collectCandidateFlowers(ctx.candidates)
    : [];
  let flowers =
    ctx?.focusFlowers?.filter((f) => inventory.includes(f)) ??
    inventory.slice(0, 3);
  if (flowers.length < 2 && inventory.length >= 2) {
    flowers = inventory.slice(0, 3);
  }

  if (flowers.length >= 2 && ctx?.candidates) {
    const parts = flowers.slice(0, 3).map((f) => {
      const hint = flowerMeaningHint(f, ctx.candidates!);
      return hint ? `${f}象徵${hint}` : `${f}適合傳遞${toneParts}的心意`;
    });
    const flowerSentence = parts.join("；");
    const occPhrase = occ ? `在${occ}情境下` : "依您描述的情境";
    return `${occPhrase}，為${who}挑選心意時，建議優先考量本店作品中的${flowers.slice(0, 3).join("、")}等花材。${flowerSentence}。這些乾燥花材可長久保存，以沉靜而細膩的方式承載您的心意。`;
  }

  if (
    occ === "傷病" ||
    /住院|康復|受傷|探病|手術|養病/.test(story)
  ) {
    if (flowers.length >= 2 && ctx?.candidates) {
      const parts = flowers.slice(0, 3).map((f) => {
        const hint = flowerMeaningHint(f, ctx.candidates!);
        return hint ? `${f}象徵${hint}` : `${f}適合傳遞${toneParts}的陪伴`;
      });
      return `依照您描述的情境，慰問療養中的${who}，宜選寓意康復與平安的花材。本店作品中的${flowers.slice(0, 3).join("、")}等花材，${parts.join("；")}。色調以柔和、安定為主，乾燥花材可長久陪伴床邊，讓心意以沉靜而不打擾的方式停留。`;
    }
    return `依照您描述的情境，慰問療養中的${who}，宜選寓意康復、長壽與平安的花材意象；色調以柔和、安定為主，避免過於鮮豔刺眼。${toneParts}可透過本店乾燥花材中寓意堅韌與陪伴的組合來傳達，讓心意以沉靜而不打擾的方式停留。`;
  }

  if (occ === "畢業" || /畢業/.test(story)) {
    return `您希望以${toneParts}為即將畢業的${who}獻上心意。此時適合選擇象徵前程與希望的色調與花材，如明亮但不浮誇的組合，讓祝福帶有「邁向新階段」的意象。壓花標本可長久保存，適合紀錄這段重要時刻。`;
  }

  return `依照您的描述，此次送禮對象為${who}，核心氛圍適合圍繞${toneParts}展開。建議優先考量花語與情境相符的花材意象，並以能長久保存的壓花標本承載心意，讓對方在日後翻閱時仍能感受您的溫度。`;
}

function parseHighlightTerms(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter((t) => t.length >= 2).slice(0, 6);
  }
  if (typeof raw === "string" && raw.trim()) {
    return [raw.trim()].slice(0, 6);
  }
  return [];
}

function parseBudgetField(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === "" || raw === "null") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

function parseFieldsFromRaw(story: string, raw: Record<string, unknown>): ParsedStoryFields {
  const parsed = PARSE_SCHEMA.safeParse({
    recipient: raw.recipient,
    occasion: raw.occasion,
    mood: raw.mood,
    budget: raw.budget,
    color: raw.color,
    flowerMeaning: raw.flowerMeaning,
  });

  const base = parsed.success
    ? parsed.data
    : {
        recipient: typeof raw.recipient === "string" ? raw.recipient : undefined,
        occasion: typeof raw.occasion === "string" ? raw.occasion : undefined,
        mood: typeof raw.mood === "string" ? raw.mood : undefined,
        color: typeof raw.color === "string" ? raw.color : undefined,
        flowerMeaning:
          typeof raw.flowerMeaning === "string" ? raw.flowerMeaning : undefined,
      };

  const sanitized = sanitizeParsedFields({
    recipient: base.recipient,
    occasion: base.occasion,
    mood: base.mood,
    budget: parseBudgetField(raw.budget),
    color: base.color,
    flowerMeaning: base.flowerMeaning?.trim() || undefined,
  });
  return coerceFieldsFromStory(story, sanitized);
}

function parseConsultantReply(
  raw: unknown,
  story: string,
  fields: ParsedStoryFields,
  ctx?: ConsultantBriefContext
): string {
  const inventory =
    ctx?.inventory ??
    (ctx?.candidates ? collectCandidateFlowers(ctx.candidates) : []);

  const rawText = typeof raw === "string" ? raw.trim() : "";
  if (!rawText || isPlaceholderWhy(rawText)) {
    return buildConsultantFallback(story, fields, ctx);
  }

  const cleaned = stripConsultantArtifacts(rawText);
  const mentions = countMentionedFlowers(cleaned, inventory);
  const tone = resolveRecommendTone(story, fields);

  if (
    cleaned.length >= 48 &&
    mentions >= 2 &&
    !isConsultantReplyLowQuality(cleaned, fields) &&
    (tone.romantic || !hasRomanticLeak(cleaned))
  ) {
    return applyRecommendTone(cleaned.slice(0, 320), tone);
  }

  return applyRecommendTone(buildConsultantFallback(story, fields, ctx), tone);
}

function parseAnalyzeFieldsResponse(
  story: string,
  text: string,
  ctx: ConsultantBriefContext
): {
  fields: ParsedStoryFields;
  consultantReply: string;
  highlightTerms: string[];
} {
  const raw = extractJsonObject(text) as Record<string, unknown>;
  const fields = parseFieldsFromRaw(story, raw);
  const inventory =
    ctx.inventory ??
    (ctx.candidates ? collectCandidateFlowers(ctx.candidates) : []);
  const consultantReply = parseConsultantReply(raw.consultantReply, story, fields, {
    ...ctx,
    inventory,
  });
  const highlightTerms = sanitizeHighlightTerms(
    parseHighlightTerms(raw.highlightTerms),
    inventory,
    flowersNamedInText(consultantReply, inventory)
  );
  return { fields, consultantReply, highlightTerms };
}

const RECOMMEND_ONLY_SYSTEM = (pickCount: number) =>
  `你是花藝推薦助手。繁體中文。從候選選 exactly ${pickCount} 張，cardId 必須是候選的 n 整數（1~${pickCount}），三張不可重複。
每張 why 必填 20~40 字（欄位名 why，勿用 reason）；家人/朋友避免愛情用語（除非明確戀人）。score 為 85~98 整數。
勿輸出 consultantReply 或其他欄位。JSON 盡量精簡。
只回 JSON：{"recommendations":[{"cardId":"1","score":92,"why":"..."},{"cardId":"2","score":88,"why":"..."},{"cardId":"3","score":85,"why":"..."}]}`;

async function fetchRecommendationsOnly(
  story: string,
  input: RecommendInput | null,
  candidates: CandidateSummary[],
  slots: CandidateSlotMaps,
  allowedIds: string[],
  pickCount: number,
  llm: RecommendLlm,
  tone?: RecommendToneContext
): Promise<Array<{ cardId: string; score: number; why: string }>> {
  const compact = compactCandidatesForPrompt(candidates, slots);
  const context = input
    ? `顧客條件：\n${formatInputForPrompt(input, tone)}`
    : [
        tone?.relationshipLine,
        `送禮描述：\n${story.trim()}`,
      ]
        .filter(Boolean)
        .join("\n");
  const user = `${context}\n\n候選(n=編號，cardId 填 n)：\n${JSON.stringify(compact)}`;
  const text = await llm.chat(RECOMMEND_ONLY_SYSTEM(pickCount), user, {
    maxOutputTokens: 1024,
  });
  let items: Array<{ cardId: string; score: number; why: string }>;
  try {
    const raw = extractJsonObject(text) as {
      recommendations?: Array<Record<string, unknown>>;
    };
    items = parseRecommendationItems(raw);
  } catch {
    const salvaged = salvageRecommendationItems(text);
    if (salvaged.length === 0) {
      throw new LlmParseError("無法解析 LLM 推薦 JSON");
    }
    items = parseRecommendationItems({ recommendations: salvaged });
  }
  return pickValidRecommendations(items, allowedIds, slots, pickCount, tone);
}

/** 僅解析欄位 + 顧問簡報（推薦另呼叫，避免 Gemini 單次 JSON 過長被截斷） */
const ANALYZE_FIELDS_SYSTEM = () =>
  `你是禮品情境解析與花藝顧問。繁體中文（台灣）。
從送禮描述抽出欄位。recipient 必填；occasion 僅能：${OCCASION_OPTIONS.join("、")} 或空字串；mood 可多個、以頓號連接，僅能：${MOOD_OPTIONS.join("、")} 或空字串。
若原文未提到預算則 budget 必須 null；未提到色調則 color 必須空字串；未提到花語／心意則 flowerMeaning 必須空字串。勿從候選卡價格推測預算。
${CONSULTANT_STYLE_RULES}
consultantReply 100~180 字；highlightTerms 2~3 個，须与花材清單完全一致。
禁止輸出 recommendations 或任何卡片編號。
只回 JSON：
{"recipient":"","occasion":"","mood":"","budget":null,"color":"","flowerMeaning":"","consultantReply":"...","highlightTerms":["卡斯比亞","星辰花"]}`;

const RECOMMEND_RETRY_SYSTEM = (pickCount: number, need: number) =>
  `你是花藝顧問。繁體中文。從候選選 exactly ${need} 張，cardId 必須是候選的 n（1~${pickCount}），不可重複。每張 why 必填 20~40 字繁中，禁止只寫「...」或省略號。
只回 JSON：{"recommendations":[{"cardId":"1","score":90,"why":"具體理由"}]}`;

const WHY_RETRY_SYSTEM = `你是花藝顧問。繁體中文。使用者已選定卡片編號 n，請只為每張撰寫 why（20~40 字），說明為何適合送禮情境。需符合收禮關係語境（若對象是家人/朋友/同事，避免使用「愛情/戀愛/情人」等字眼；除非原文明確是戀人/老婆/老公）。禁止「...」或空字串。
只回 JSON：{"recommendations":[{"cardId":"1","why":"具體理由"}]}`;

function parseRecommendationItems(
  raw: { recommendations?: Array<Record<string, unknown>> }
): Array<{ cardId: string; score: number; why: string }> {
  const list = raw?.recommendations ?? [];
  return list.map((r) => {
    const cardId = String(r.cardId ?? r.id ?? r.n ?? r.slot ?? "").trim();
    const scoreRaw = r.score ?? r.match ?? 85;
    const score =
      typeof scoreRaw === "number"
        ? scoreRaw
        : Number(String(scoreRaw).replace(/[^\d.]/g, "")) || 85;
    return {
      cardId,
      score,
      why: normalizeWhy(r.why ?? r.reason),
    };
  });
}

/** 模型常對第 2、3 張只回 "..."，另呼一次只補 why */
async function fillPlaceholderWhys(
  story: string,
  recs: Array<{ cardId: string; score: number; why: string }>,
  candidates: CandidateSummary[],
  slots: CandidateSlotMaps,
  allowedIds: string[],
  llm: RecommendLlm,
  tone?: RecommendToneContext
): Promise<{
  recs: Array<{ cardId: string; score: number; why: string }>;
  extraCalls: number;
}> {
  const bad = recs.filter((r) => isPlaceholderWhy(r.why));
  if (bad.length === 0) return { recs, extraCalls: 0 };

  const compact = compactCandidatesForPrompt(candidates, slots);
  const retryUser = [
    tone?.relationshipLine,
    `送禮描述：\n${story.trim()}`,
    `已選卡片（請為每個 n 寫 why，cardId 填 n）：\n${JSON.stringify(
      bad.map((r) => ({ n: slots.uuidToSlot.get(r.cardId), score: r.score }))
    )}`,
    `候選：\n${JSON.stringify(compact)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const retryText = await llm.chat(WHY_RETRY_SYSTEM, retryUser, {
    maxOutputTokens: 360,
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
        "",
        tone
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
      if (isPlaceholderWhy(r.why)) {
        return { ...r, why: normalizeWhy(r.why, DEFAULT_WHY, tone) };
      }
      return tone
        ? { ...r, why: applyRecommendTone(r.why, tone) }
        : r;
    });
    return { recs: tone ? toneSanitizeRecs(merged, tone) : merged, extraCalls: 1 };
  } catch {
    return {
      recs: tone
        ? toneSanitizeRecs(
            recs.map((r) =>
              isPlaceholderWhy(r.why)
                ? { ...r, why: normalizeWhy(r.why, DEFAULT_WHY, tone) }
                : r
            ),
            tone
          )
        : recs.map((r) =>
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

const PARSE_PROMPT = `你是禮品情境解析助手。請從使用者的一段繁體中文送禮描述中，抽出結構化欄位。
occasion 只能從：${OCCASION_OPTIONS.join("、")} 或空字串。
mood 只能從：${MOOD_OPTIONS.join("、")} 或空字串。
budget 為整數新台幣或 null。
color 為簡短色名（如粉、白、黃）或空字串。
recipient 為送禮對象短詞或空字串。
flowerMeaning 為期望傳達的花語或心意關鍵字（短句，可空）。

只回傳 JSON：
{"recipient":"","occasion":"","mood":"","budget":null,"color":"","flowerMeaning":""}`;

/** 單次 LLM：解析情境欄位 + 從候選選推薦（analyze 用）；不足 3 張時最多補呼一次 */
export async function analyzeStoryWithOllama(
  story: string,
  candidates: CandidateSummary[],
  llm: RecommendLlm = createRecommendLlm()
): Promise<{
  fields: ParsedStoryFields;
  consultantReply: string;
  highlightTerms: string[];
  recommendations: Array<{ cardId: string; score: number; why: string }>;
  aiCallCount: number;
}> {
  if (candidates.length < 1) {
    throw new LlmParseError("候選作品不足，無法分析");
  }

  await llm.ready();
  const pickCount = Math.min(3, candidates.length);
  const allowedIds = candidates.map((c) => c.id);
  const slots = buildCandidateSlotMaps(candidates);
  const compact = compactCandidatesForPrompt(candidates, slots);

  let aiCallCount = 0;
  const inventory = collectCandidateFlowers(candidates);
  const prelimFields = coerceFieldsFromStory(story, {});
  let tone = resolveRecommendTone(story, prelimFields);
  const user = [
    tone.relationshipLine,
    `送禮描述：\n${story.trim()}`,
    formatFlowerInventoryForPrompt(inventory),
    `候選作品摘要(n=編號，cardId 請填 n 的數字)：\n${JSON.stringify(compact)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const fieldsText = await llm.chat(ANALYZE_FIELDS_SYSTEM(), user, {
    maxOutputTokens: 900,
  });
  aiCallCount += 1;

  let result: {
    fields: ParsedStoryFields;
    consultantReply: string;
    highlightTerms: string[];
    recommendations: Array<{ cardId: string; score: number; why: string }>;
  };
  try {
    const parsed = parseAnalyzeFieldsResponse(story, fieldsText, {
      candidates,
      inventory,
    });
    result = { ...parsed, recommendations: [] };
  } catch (e) {
    console.warn("analyze fields JSON parse failed:", e);
    const fields = coerceFieldsFromStory(story, {});
    result = {
      fields,
      consultantReply: buildConsultantFallback(story, fields, { candidates }),
      highlightTerms: inventory.slice(0, 3),
      recommendations: [],
    };
  }

  const mergedFields = coerceFieldsFromStory(story, result.fields);
  result.fields = mergedFields;
  tone = resolveRecommendTone(story, mergedFields);

  try {
    const recs = await fetchRecommendationsOnly(
      story,
      null,
      candidates,
      slots,
      allowedIds,
      pickCount,
      llm,
      tone
    );
    aiCallCount += 1;
    result.recommendations = recs;
  } catch (e) {
    console.warn("recommend-only call failed:", e);
  }

  if (result.recommendations.length < pickCount) {
    try {
      const extra = await fetchRecommendationsOnly(
        story,
        null,
        candidates,
        slots,
        allowedIds,
        pickCount,
        llm,
        tone
      );
      aiCallCount += 1;
      const seen = new Set(result.recommendations.map((r) => r.cardId));
      for (const r of extra) {
        if (seen.has(r.cardId)) continue;
        seen.add(r.cardId);
        result.recommendations.push(r);
        if (result.recommendations.length >= pickCount) break;
      }
    } catch (e) {
      console.warn("recommend-only retry failed:", e);
    }
  }

  if (pickCount >= 1) {
    const { recs, extraCalls } = await fillPlaceholderWhys(
      story,
      result.recommendations,
      candidates,
      slots,
      allowedIds,
      llm,
      tone
    );
    result.recommendations = recs;
    aiCallCount += extraCalls;
  }

  if (result.recommendations.length < pickCount && pickCount >= 3) {
    const need = pickCount - result.recommendations.length;
    const usedSlots = new Set(
      result.recommendations.map((r) => slots.uuidToSlot.get(r.cardId)).filter(Boolean)
    );
    const retryUser = [
      tone.relationshipLine,
      `需求：${story.trim()}`,
      `已選 n：${[...usedSlots].join(",") || "無"}`,
      `再選 ${need} 張不同 n。`,
      `候選：\n${JSON.stringify(compact)}`,
    ].join("\n");
    const retryText = await llm.chat(
      RECOMMEND_RETRY_SYSTEM(pickCount, need),
      retryUser,
      { maxOutputTokens: 280 }
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
        need,
        tone
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

  result.recommendations = toneSanitizeRecs(result.recommendations, tone);

  const focusFlowers = flowersFromRecommendations(
    result.recommendations,
    candidates
  );
  const brief = finalizeConsultantBrief(story, mergedFields, {
    candidates,
    inventory,
    focusFlowers,
    rawConsultant: result.consultantReply,
    rawHighlights: result.highlightTerms,
  });

  return {
    fields: mergedFields,
    consultantReply: applyRecommendTone(brief.consultantReply, tone),
    highlightTerms: brief.highlightTerms,
    recommendations: result.recommendations,
    aiCallCount,
  };
}

export async function parseStoryWithOllama(
  story: string,
  llm: RecommendLlm = createRecommendLlm()
): Promise<ParsedStoryFields> {
  await llm.ready();
  const text = await llm.chat(PARSE_PROMPT, story.trim(), { maxOutputTokens: 256 });
  const parsed = PARSE_SCHEMA.safeParse(extractJsonObject(text));
  if (!parsed.success) {
    throw new LlmParseError("無法解析 LLM 回傳的情境欄位");
  }
  const { budget, flowerMeaning, ...rest } = parsed.data;
  const sanitized = sanitizeParsedFields({
    ...rest,
    budget: budget ?? undefined,
    flowerMeaning: flowerMeaning?.trim() || undefined,
  });
  return coerceFieldsFromStory(story, sanitized);
}

function formatInputForPrompt(
  input: RecommendInput,
  tone?: RecommendToneContext
): string {
  return [
    tone?.relationshipLine,
    `故事=${input.story?.trim() || "無"}`,
    `對象=${input.recipient?.trim() || "無"}`,
    `場合=${input.occasion?.trim() || "無"}`,
    `情緒=${input.mood?.trim() || "無"}`,
    `花語=${input.flowerMeaning?.trim() || "無"}`,
    `預算=${input.budget ?? "無"}`,
    `色系=${input.color?.trim() || "無"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function recommendWithOllama(
  input: RecommendInput,
  candidates: CandidateSummary[],
  llm: RecommendLlm = createRecommendLlm()
): Promise<{
  recommendations: Array<{ cardId: string; score: number; why: string }>;
  consultantReply: string;
  highlightTerms: string[];
}> {
  if (candidates.length < 1) {
    throw new LlmParseError("候選作品不足，無法推薦");
  }

  await llm.ready();
  const pickCount = Math.min(3, candidates.length);
  const slots = buildCandidateSlotMaps(candidates);
  const allowedIds = candidates.map((c) => c.id);
  const storyText = input.story?.trim() || formatInputForPrompt(input);
  const prelimFields = coerceFieldsFromStory(storyText, {
    recipient: input.recipient,
    occasion: input.occasion,
    mood: input.mood,
    budget: input.budget,
    color: input.color,
    flowerMeaning: input.flowerMeaning,
  });
  const tone = resolveRecommendTone(storyText, prelimFields);
  const inventory = collectCandidateFlowers(candidates);
  const user = [
    `顧客需求：\n${formatInputForPrompt(input, tone)}`,
    formatFlowerInventoryForPrompt(inventory),
    `候選(n=編號)：\n${JSON.stringify(compactCandidatesForPrompt(candidates, slots))}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const text = await llm.chat(RECOMMEND_ONLY_SYSTEM(pickCount), user, {
    maxOutputTokens: 1200,
  });
  let raw: Record<string, unknown>;
  try {
    raw = extractJsonObject(text) as Record<string, unknown>;
  } catch {
    throw new LlmParseError("無法解析 LLM 回傳的推薦 JSON");
  }

  const items = parseRecommendationItems(
    raw as { recommendations?: Array<Record<string, unknown>> }
  );

  let valid = pickValidRecommendations(items, allowedIds, slots, pickCount, tone);

  if (valid.length < pickCount) {
    try {
      const extra = await fetchRecommendationsOnly(
        input.story?.trim() ?? "",
        input,
        candidates,
        slots,
        allowedIds,
        pickCount,
        llm,
        tone
      );
      const seen = new Set(valid.map((r) => r.cardId));
      for (const r of extra) {
        if (seen.has(r.cardId)) continue;
        seen.add(r.cardId);
        valid.push(r);
        if (valid.length >= pickCount) break;
      }
    } catch (e) {
      console.warn("refine recommend-only retry failed:", e);
    }
  }

  if (valid.length < pickCount && pickCount >= 3) {
    const need = pickCount - valid.length;
    const retryText = await llm.chat(
      RECOMMEND_RETRY_SYSTEM(pickCount, need),
      [
        tone.relationshipLine,
        `需求：\n${formatInputForPrompt(input, tone)}`,
        `候選：\n${JSON.stringify(compactCandidatesForPrompt(candidates, slots))}`,
      ].join("\n"),
      { maxOutputTokens: 280 }
    );
    try {
      const retryRaw = extractJsonObject(retryText) as {
        recommendations?: Array<Record<string, unknown>>;
      };
      const extra = pickValidRecommendations(
        parseRecommendationItems(retryRaw),
        allowedIds,
        slots,
        need,
        tone
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

  const { recs: filled } = await fillPlaceholderWhys(
    storyText,
    valid,
    candidates,
    slots,
    allowedIds,
    llm,
    tone
  );
  const recs = toneSanitizeRecs(filled, tone);

  const fieldsFromInput: ParsedStoryFields = {
    recipient: input.recipient,
    occasion: input.occasion,
    mood: input.mood,
    budget: input.budget,
    color: input.color,
    flowerMeaning: input.flowerMeaning,
  };
  const mergedFields = coerceFieldsFromStory(storyText, fieldsFromInput);
  const focusFlowers = flowersFromRecommendations(recs, candidates);
  const brief = finalizeConsultantBrief(storyText, mergedFields, {
    candidates,
    inventory,
    focusFlowers,
    rawConsultant:
      typeof raw.consultantReply === "string" ? raw.consultantReply : undefined,
    rawHighlights: parseHighlightTerms(raw.highlightTerms),
  });

  return {
    recommendations: recs,
    consultantReply: applyRecommendTone(brief.consultantReply, tone),
    highlightTerms: brief.highlightTerms,
  };
}
