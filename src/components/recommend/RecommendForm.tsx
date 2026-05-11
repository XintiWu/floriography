"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/Button";
import type { Card, Flower } from "@/lib/types";

const schema = z.object({
  recipient: z.string().optional(),
  occasion: z.string().optional(),
  mood: z.string().optional(),
  story: z.string().optional(),
  budget: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
      message: "預算需為數字",
    }),
  color: z.string().optional(),
});

type Input = z.input<typeof schema>;

function extractKeywords(text: string): string[] {
  if (!text) return [];
  const ngrams = new Set<string>();
  const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '');
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i <= cleanText.length - n; i++) {
      ngrams.add(cleanText.substring(i, i + n));
    }
  }
  return Array.from(ngrams);
}

function scoreCard(card: Card, input: z.output<typeof schema>, flowers: Flower[]) {
  let score = 0;
  const why: string[] = [];

  if (input.occasion) {
    const hit = card.tags.occasions.includes(input.occasion);
    if (hit) {
      score += 3;
      why.push(`符合「${input.occasion}」場合`);
    }
  }
  if (input.mood) {
    const hit = card.tags.moods.includes(input.mood);
    if (hit) {
      score += 4;
      why.push(`情緒偏「${input.mood}」`);
    }
  }
  if (input.color) {
    const hit = card.tags.colors.some((c) => c.includes(input.color!));
    if (hit) {
      score += 2;
      why.push(`色系含「${input.color}」`);
    }
  }
  if (typeof input.budget === "number") {
    const delta = Math.abs(card.priceTwd - input.budget);
    if (delta <= 50) {
      score += 2;
      why.push("價格接近你的預算");
    } else if (delta <= 120) {
      score += 1;
    }
  }

  const userText = [input.story, input.mood, input.occasion, input.recipient].filter(Boolean).join(" ");
  const userKeywords = extractKeywords(userText);
  let nlpMatchedKeywords: string[] = [];
  let bestFlowerMatch: { flowerName: string, meaning: string, keyword: string } | null = null;

  const cardFlowersData = flowers.filter(f => card.tags.flowers.includes(f.name));
  
  for (const f of cardFlowersData) {
    let localMatches: string[] = [];
    let standardMatched = false;

    if (input.occasion && (f.meanings.includes(input.occasion) || f.relatedTags?.includes(input.occasion))) {
      standardMatched = true;
      score += 5;
    }
    if (input.mood && (f.meanings.includes(input.mood) || f.relatedTags?.includes(input.mood))) {
      standardMatched = true;
      score += 5;
    }
    
    if (userKeywords.length > 0) {
      for (const kw of userKeywords) {
        if (kw.length < 2) continue;
        const matchInMeanings = f.meanings.find(m => m.includes(kw) || kw.includes(m));
        const matchInStory = f.story && f.story.includes(kw);
        
        if (matchInMeanings || matchInStory) {
          localMatches.push(kw);
          score += kw.length * 4; 
          
          if (!bestFlowerMatch) {
              bestFlowerMatch = {
                  flowerName: f.name,
                  meaning: matchInMeanings || f.meanings[0],
                  keyword: kw
              };
          }
        }
      }
      nlpMatchedKeywords.push(...localMatches);
    } else if (standardMatched) {
      why.push(`採用「${f.name}」（花語：${f.meanings.slice(0, 2).join("、")}），非常契合您的心意`);
    }
  }

  nlpMatchedKeywords = Array.from(new Set(nlpMatchedKeywords));
  
  if (bestFlowerMatch && nlpMatchedKeywords.length > 0) {
     const kwText = nlpMatchedKeywords.slice(0, 3).map(k => `『${k}』`).join('與');
     why.push(`從您的故事中，我們讀到了${kwText}。這張卡片特別選用「${bestFlowerMatch.flowerName}」（花語：${bestFlowerMatch.meaning}），希望能完美傳遞這份專屬情感！`);
  }

  if (card.status === "available") score += 1;
  if (card.status === "sold") score -= 2;

  return { score, why };
}

export function RecommendForm() {
  const router = useRouter();
  const [form, setForm] = useState<Input>({
    recipient: "",
    occasion: "",
    mood: "",
    story: "",
    budget: "",
    color: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [results, setResults] = useState<
    Array<{ card: Card; score: number; why: string[] }>
  >([]);
  const [loading, setLoading] = useState(false);

  const canRecommend = useMemo(() => {
    const parsed = schema.safeParse(form);
    return parsed.success;
  }, [form]);

  const recommend = async () => {
    setErrors({});
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setLoading(true);
    const [cardsRes, flowersRes] = await Promise.all([
      fetch("/api/cards"),
      fetch("/api/flowers"),
    ]);
    const cardsJson = (await cardsRes.json()) as { cards: Card[] };
    const flowersJson = (await flowersRes.json()) as { flowers: Flower[] };
    const cards = cardsJson.cards ?? [];
    const flowers = flowersJson.flowers ?? [];

    const scored = cards
      .map((card) => {
        const s = scoreCard(card, parsed.data, flowers);
        return { card, score: s.score, why: s.why };
      })
      .sort((a, b) => b.score - a.score);

    setResults(scored.slice(0, 3));
    setLoading(false);
  };

  const inputClass =
    "h-11 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]";

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
      <div className="lg:col-span-6">
        <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            INPUT
          </p>
          <div className="mt-6 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-semibold tracking-wide flex items-center gap-2">
                自由描述 <span className="rounded bg-black/5 dark:bg-white/10 px-1.5 py-0.5 text-[10px] text-[color:var(--muted)]">文字探勘支援</span>
              </span>
              <textarea
                className="min-h-[100px] w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] resize-none"
                value={form.story ?? ""}
                onChange={(e) =>
                  setForm((s) => ({ ...s, story: e.target.value }))
                }
                placeholder="說說您的故事或送禮情境吧！系統會自動捕捉關鍵字，為您尋找最契合的花語..."
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold tracking-wide">
                送禮對象（選填）
              </span>
              <input
                className={inputClass}
                value={form.recipient ?? ""}
                onChange={(e) =>
                  setForm((s) => ({ ...s, recipient: e.target.value }))
                }
                placeholder="例：爸爸、同事、朋友…"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold tracking-wide">
                  場合（選填）
                </span>
                <select
                  className={inputClass}
                  value={form.occasion ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, occasion: e.target.value }))
                  }
                >
                  <option value="">不限</option>
                  {["生日", "畢業", "加油", "紀念日", "日常"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold tracking-wide">
                  情緒（選填）
                </span>
                <select
                  className={inputClass}
                  value={form.mood ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, mood: e.target.value }))
                  }
                >
                  <option value="">不限</option>
                  {["溫柔", "祝福", "鼓勵", "希望", "思念", "安定"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold tracking-wide">
                  預算（選填）
                </span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={String(form.budget ?? "")}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, budget: e.target.value }))
                  }
                  placeholder="例：200"
                />
                {errors.budget ? (
                  <span className="text-xs font-semibold text-[color:var(--accent)]">
                    {errors.budget}
                  </span>
                ) : null}
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold tracking-wide">
                  色系（選填）
                </span>
                <input
                  className={inputClass}
                  value={form.color ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, color: e.target.value }))
                  }
                  placeholder="例：粉、白、黃…"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" size="lg" onClick={recommend} disabled={!canRecommend}>
                {loading ? "計算中…" : "產生推薦"}
              </Button>
              <p className="text-xs text-[color:var(--muted)]">
                之後可升級為多模態推薦（文字＋圖片 embedding）。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-6">
        <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            OUTPUT
          </p>

          {results.length ? (
            <div className="mt-6 grid gap-3">
              {results.map((r) => (
                <div
                  key={r.card.id}
                  onClick={() => router.push(`/cards/${r.card.id}`)}
                  className="rounded-3xl border border-[color:var(--line)] p-5 transition-colors hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold tracking-wide">
                        {r.card.title}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--muted)]">
                        {r.card.status === "available"
                          ? `NT$ ${r.card.priceTwd}`
                          : r.card.status === "sold"
                            ? "已售出"
                            : "可客製委託"}
                      </p>
                    </div>
                    <span className="rounded-full bg-black/5 px-3 py-2 text-[11px] font-semibold tracking-wide dark:bg-white/10">
                      分數 {r.score}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
                    推薦理由：{r.why.length ? r.why.join("、") : "整體風格最接近"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/reserve?cardId=${encodeURIComponent(r.card.id)}`}
                      className="inline-flex h-10 items-center justify-center rounded-full bg-[color:var(--ink)] px-4 text-[13px] font-semibold tracking-wide text-[color:var(--paper)] hover:bg-black/85"
                      onClick={(e) => e.stopPropagation()}
                    >
                      預訂/詢價這張
                    </Link>
                    <span className="inline-flex h-10 items-center justify-center rounded-full border border-[color:var(--line)] px-4 text-[13px] font-semibold tracking-wide text-[color:var(--muted)]">
                      {r.card.tags.moods[0] ?? "心意"}
                    </span>
                  </div>
                </div>
              ))}
              <div className="mt-2 text-xs text-[color:var(--muted)]">
                也可以直接{" "}
                <Link className="underline" href="/reserve">
                  填表描述你的情境
                </Link>{" "}
                ，我們會協助你確認成品與面交。
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm leading-7 text-[color:var(--muted)]">
              填完左邊情境後，這裡會列出 3 個推薦作品與原因。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

