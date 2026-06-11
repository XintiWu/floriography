import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeMoodPartForScoring,
  splitTagField,
} from "@/lib/parseStoryRules";
import type { Card } from "@/lib/types";

export type CatalogCard = Card & {
  indexText: string;
  /** Gemini text-embedding-004 vector (768-dim). Present when built with GEMINI_API_KEY. */
  embedding?: number[];
};

export type FlowerCatalogData = {
  cards: CatalogCard[];
  dictionary: string[];
  builtAt?: string;
};

export type RecommendInput = {
  recipient?: string;
  occasion?: string;
  mood?: string;
  story?: string;
  budget?: number;
  color?: string;
  flowerMeaning?: string;
};

export type ScoredRecommendation = {
  card: Card;
  score: number;
  why: string;
};

const WEIGHTS = {
  occasion: 28,
  mood: 28,
  color: 22,
  recipient: 12,
  budgetWithin: 18,
  budgetNear: 8,
  budgetFarPenalty: -25,
};

/** Weight to give cosine similarity score (scaled 0–1) in the hybrid scorer */
const EMBED_WEIGHT = 60;

let catalogCache: FlowerCatalogData | null = null;

// ── Embedding helpers (runtime) ─────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Call Gemini text-embedding-004 at runtime to embed the user query.
 * Returns null on any failure so callers can fall back to string matching.
 */
export async function embedQueryText(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const model = "gemini-embedding-001";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const values: number[] | undefined = data?.embedding?.values;
    return values && values.length > 0 ? values : null;
  } catch {
    return null;
  }
}

export function getFlowerCatalog(): FlowerCatalogData {
  const path = join(process.cwd(), "src/data/flowerCatalog.json");
  if (!existsSync(path)) {
    throw new Error(
      "找不到 src/data/flowerCatalog.json。請在專案根目錄執行：npm run build:catalog（或 npm run dev，會自動執行 predev）"
    );
  }
  if (process.env.NODE_ENV !== "production") {
    return JSON.parse(readFileSync(path, "utf8")) as FlowerCatalogData;
  }
  if (!catalogCache) {
    catalogCache = JSON.parse(readFileSync(path, "utf8")) as FlowerCatalogData;
  }
  return catalogCache;
}

export function toPublicCard(c: CatalogCard): Card {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip internal index field
  const { indexText, ...rest } = c;
  return rest;
}

function normalizeLoose(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000,_，、]+/g, "");
}

/** 推薦評分僅使用右欄五格（不含左欄 story） */
export function hasStructuredInput(input: RecommendInput): boolean {
  const textFields = [
    input.recipient,
    input.occasion,
    input.mood,
    input.color,
    input.flowerMeaning,
  ].some((x) => Boolean(x && String(x).trim()));
  const hasBudget =
    typeof input.budget === "number" && Number.isFinite(input.budget) && input.budget >= 0;
  return textFields || hasBudget;
}

export function validateRecommendInput(input: RecommendInput): boolean {
  return hasStructuredInput(input);
}

function tagMatch(
  userValue: string | undefined,
  tags: string[],
  indexText: string
): { hit: boolean; partial: boolean } {
  if (!userValue?.trim()) return { hit: false, partial: false };
  const u = normalizeLoose(userValue);
  if (!u) return { hit: false, partial: false };
  const exact = tags.some((t) => normalizeLoose(t) === u);
  if (exact) return { hit: true, partial: false };
  const partial =
    tags.some((t) => u.includes(normalizeLoose(t)) || normalizeLoose(t).includes(u)) ||
    indexText.includes(u);
  return { hit: false, partial };
}

function scoreBudget(
  budget: number | undefined,
  price: number
): { delta: number; note: string | null } {
  if (budget === undefined || !Number.isFinite(budget) || budget < 0) {
    return { delta: 0, note: null };
  }
  const diff = price - budget;
  if (diff <= 0) {
    return {
      delta: WEIGHTS.budgetWithin,
      note: `價格 NT$${price} 在預算 NT$${budget} 內`,
    };
  }
  if (diff <= 80) {
    return {
      delta: WEIGHTS.budgetNear,
      note: `價格略高於預算約 NT$${diff}`,
    };
  }
  if (diff > 220) {
    return {
      delta: WEIGHTS.budgetFarPenalty,
      note: `價格高於預算約 NT$${diff}`,
    };
  }
  return { delta: 0, note: null };
}

type FieldNotes = {
  occasion?: string;
  mood?: string;
  color?: string;
  recipient?: string;
  budget?: string;
  flowerMeaning?: string;
};

function buildStructuredWhy(input: RecommendInput, notes: FieldNotes): string {
  const parts: string[] = [];
  if (notes.occasion) parts.push(notes.occasion);
  if (notes.mood) parts.push(notes.mood);
  if (notes.color) parts.push(notes.color);
  if (notes.recipient) parts.push(notes.recipient);
  if (notes.budget) parts.push(notes.budget);
  if (notes.flowerMeaning) parts.push(notes.flowerMeaning);
  if (parts.length === 0) {
    parts.push("與您填寫的條件有部分共通標籤，可作為參考");
  }
  const who = input.recipient?.trim() || "收禮人";
  return `【條件比對】${parts.join("；")}。適合傳達給 ${who} 的心意。`;
}

function normalizeDisplayScores(
  ranked: Array<{ card: CatalogCard; rawScore: number; why: string }>
): Array<{ card: CatalogCard; score: number; why: string }> {
  if (ranked.length === 0) return [];

  const pool = ranked.slice(0, Math.min(24, ranked.length));
  const min = Math.min(...pool.map((r) => r.rawScore));
  const max = Math.max(...pool.map((r) => r.rawScore));
  const fallbackTop3 = [98, 84, 72];

  return ranked.map((r, index) => {
    let display: number;
    if (index < 3) {
      const rankBase = fallbackTop3[index] ?? 65;
      if (max === min) {
        display = rankBase;
      } else {
        const bump = Math.round(((r.rawScore - min) / (max - min)) * 4);
        display = Math.min(98, rankBase + bump);
      }
    } else {
      const t = max === min ? 0.5 : (r.rawScore - min) / (max - min);
      display = Math.round(55 + t * 35);
    }
    return { card: r.card, score: Math.min(98, Math.max(55, display)), why: r.why };
  });
}

export function scoreCatalogLocally(
  input: RecommendInput,
  data: FlowerCatalogData
): Array<{ card: CatalogCard; score: number; why: string }> {
  const recipientN = input.recipient ? normalizeLoose(input.recipient) : "";
  const colorN = input.color ? normalizeLoose(input.color) : "";

  const ranked = data.cards.map((card) => {
    let rawScore = 0;
    const notes: FieldNotes = {};

    if (input.occasion?.trim()) {
      const { hit, partial } = tagMatch(
        input.occasion,
        card.tags.occasions,
        card.indexText
      );
      if (hit) {
        rawScore += WEIGHTS.occasion;
        notes.occasion = `場合「${input.occasion}」與作品標籤吻合`;
      } else if (partial) {
        rawScore += WEIGHTS.occasion * 0.45;
        notes.occasion = `場合「${input.occasion}」與作品情境相近`;
      }
    }

    const moodParts = splitTagField(input.mood).map(normalizeMoodPartForScoring);
    if (moodParts.length > 0) {
      let moodBest = 0;
      const moodHits: string[] = [];
      for (const part of moodParts) {
        const { hit, partial } = tagMatch(part, card.tags.moods, card.indexText);
        if (hit) {
          moodBest = Math.max(moodBest, WEIGHTS.mood);
          moodHits.push(part);
        } else if (partial) {
          moodBest = Math.max(moodBest, WEIGHTS.mood * 0.45);
          if (!moodHits.includes(part)) moodHits.push(part);
        }
      }
      if (moodBest > 0) {
        rawScore += moodBest;
        notes.mood =
          moodHits.length > 0
            ? `情緒「${moodHits.join("、")}」與作品氛圍相近`
            : `情緒與作品調性相近`;
      }
    }

    if (input.color?.trim()) {
      const colorTags = card.tags.colors;
      const hit =
        colorTags.some((c) => normalizeLoose(c).includes(colorN) || colorN.includes(normalizeLoose(c))) ||
        card.indexText.includes(colorN);
      if (hit) {
        rawScore += WEIGHTS.color;
        notes.color = `色系「${input.color}」與作品主色相近`;
      }
    }

    if (recipientN) {
      if (card.indexText.includes(recipientN)) {
        rawScore += WEIGHTS.recipient;
        notes.recipient = `敘事索引呼應送禮對象「${input.recipient}」`;
      }
    }

    const meaningN = input.flowerMeaning ? normalizeLoose(input.flowerMeaning) : "";
    if (meaningN && card.indexText.includes(meaningN)) {
      rawScore += 14;
      notes.flowerMeaning = `花語／心意「${input.flowerMeaning}」與作品索引相近`;
    } else if (meaningN) {
      const meaningParts = input.flowerMeaning!
        .split(/[,，、\s]+/)
        .map((p) => normalizeLoose(p))
        .filter((p) => p.length >= 2);
      const hit = meaningParts.some((p) => card.indexText.includes(p));
      if (hit) {
        rawScore += 10;
        notes.flowerMeaning = `花語關鍵字與作品花材語意相呼應`;
      }
    }

    const { delta: bDelta, note: budgetNote } = scoreBudget(input.budget, card.priceTwd);
    rawScore += bDelta;
    if (budgetNote) notes.budget = budgetNote;

    const why = buildStructuredWhy(input, notes);
    return { card, rawScore, why };
  });

  ranked.sort((a, b) => b.rawScore - a.rawScore);
  return normalizeDisplayScores(ranked);
}

export function recommendFlowerDb(
  input: RecommendInput,
  top = 3
): ScoredRecommendation[] {
  const data = getFlowerCatalog();
  const ranked = scoreCatalogLocally(input, data);
  return ranked.slice(0, top).map(({ card, score, why }) => ({
    card: toPublicCard(card),
    score,
    why,
  }));
}

/**
 * Async version of scoreCatalogLocally that uses cosine similarity when
 * card embeddings are present. Falls back to the sync string-based scorer
 * if embeddings are missing or the query embed call fails.
 *
 * Usage: replaces scoreCatalogLocally in the recommend API pipeline.
 */
export async function scoreCatalogWithEmbedding(
  input: RecommendInput,
  data: FlowerCatalogData
): Promise<Array<{ card: CatalogCard; score: number; why: string }>> {
  // Check whether the catalog has embeddings
  const hasEmbeddings = data.cards.some((c) => c.embedding && c.embedding.length > 0);
  if (!hasEmbeddings) {
    // Fall back to string-based scorer
    return scoreCatalogLocally(input, data);
  }

  // Build query text: prefer story, then combine structured fields
  const queryParts: string[] = [];
  if (input.story?.trim()) queryParts.push(input.story.trim());
  if (input.occasion?.trim()) queryParts.push(input.occasion.trim());
  if (input.mood?.trim()) queryParts.push(input.mood.trim());
  if (input.color?.trim()) queryParts.push(input.color.trim());
  if (input.recipient?.trim()) queryParts.push(input.recipient.trim());
  if (input.flowerMeaning?.trim()) queryParts.push(input.flowerMeaning.trim());
  const queryText = queryParts.join("、");

  const queryVec = queryText ? await embedQueryText(queryText) : null;

  if (!queryVec) {
    // Embed call failed or no text — fall back
    return scoreCatalogLocally(input, data);
  }

  const recipientN = input.recipient ? normalizeLoose(input.recipient) : "";

  const ranked = data.cards.map((card) => {
    // ─ Cosine similarity (semantic) ────────────────────────────────
    let rawScore = 0;
    const notes: FieldNotes = {};

    if (card.embedding && card.embedding.length > 0) {
      const sim = cosineSimilarity(queryVec, card.embedding);
      // sim is typically 0.5~0.95 for relevant content; scale to weight range
      rawScore += sim * EMBED_WEIGHT;
      notes.occasion = `語意相似度 ${(sim * 100).toFixed(0)}%`;
    }

    // ─ Budget scoring (preserve exact logic) ──────────────────────────
    const { delta: bDelta, note: budgetNote } = scoreBudget(input.budget, card.priceTwd);
    rawScore += bDelta;
    if (budgetNote) notes.budget = budgetNote;

    // ─ Recipient index boost (cheap text check) ────────────────────
    if (recipientN && card.indexText.includes(recipientN)) {
      rawScore += WEIGHTS.recipient;
      notes.recipient = `敘事索引呼應送禮對象「${input.recipient}」`;
    }

    const why = buildStructuredWhy(input, notes);
    return { card, rawScore, why };
  });

  ranked.sort((a, b) => b.rawScore - a.rawScore);
  return normalizeDisplayScores(ranked);
}
