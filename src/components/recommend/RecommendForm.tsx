"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/Button";
import { RecommendLoadingProgress } from "@/components/recommend/RecommendLoadingProgress";
import { RecommendTagChips } from "@/components/recommend/RecommendTagChips";
import {
  FLOWER_MEANING_TAGS,
  MOOD_ATMOSPHERE_TAGS,
  joinTagsToField,
  meaningTagsFromField,
  moodTagsFromField,
} from "@/data/recommendTagOptions";
import type { Card } from "@/lib/types";
import { getCardStoryText } from "@/lib/cardText";

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
  flowerMeaning: z.string().optional(),
});

type Input = z.input<typeof schema>;
type AnalyzePhase = "idle" | "parsing" | "filling" | "recommending" | "done" | "error";
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const LLM_UNAVAILABLE_MSG =
  "無法連線 AI 服務。請在 .env.local 設定 GEMINI_API_KEY（建議，見 docs/gemini-recommend-setup.md），或啟動本機 Ollama（ollama serve、ollama pull llama3.2:3b）作為備援。";

function cardStoryText(card: Card): string {
  return getCardStoryText(card);
}

function CardProductImage({ card }: { card: Card }) {
  const src = card.images[0];
  if (!src) return null;
  const width = card.imageWidth ?? 900;
  const height = card.imageHeight ?? 1200;
  return (
    <div className="mb-3 w-full overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--background)]">
      <Image
        src={src}
        alt={card.tags.flowers.join("、") || card.title}
        width={width}
        height={height}
        className="h-auto w-full object-contain"
        sizes="(max-width: 768px) 100vw, 33vw"
      />
    </div>
  );
}

function RecommendResults({
  results,
  engine,
  expandedCardId,
  setExpandedCardId,
  onClearResults,
}: {
  results: Array<{ card: Card; score: number; why: string }>;
  engine: string;
  expandedCardId: string | null;
  setExpandedCardId: React.Dispatch<React.SetStateAction<string | null>>;
  onClearResults: () => void;
}) {
  return (
    <div className="mt-10 flex flex-col gap-8 animate-fade-in border-t border-[color:var(--line)] pt-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-[color:var(--accent)]/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[color:var(--accent)] border border-[color:var(--accent)]/20">
              AI 推薦結果
            </span>
            {engine && (
              <span className="rounded-full bg-[color:var(--ink)] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[color:var(--paper)] shadow-sm">
                {engine}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold tracking-wide mt-2">專屬花藝解答與推薦作品</h2>
          <p className="text-xs text-[color:var(--muted)] mt-0.5">
            以下為依顧問建議精選的作品；可微調右欄標籤後按「重新生成」更新。
          </p>
        </div>
        <button
          type="button"
          onClick={onClearResults}
          className="h-10 px-4 rounded-full border border-[color:var(--line)] bg-[color:var(--card)]/80 text-xs font-semibold tracking-wide text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
        >
          <span>←</span>
          <span>修改需求</span>
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((r, index) => {
          const isHighlyRecommended = index === 0;
          return (
            <div
              key={r.card.id}
              className={`group relative rounded-3xl p-5 transition-all duration-300 flex flex-col justify-between bg-[color:var(--card)] ${
                isHighlyRecommended
                  ? "border-2 border-[color:var(--accent)] shadow-md shadow-[color:var(--accent)]/5"
                  : "border border-[color:var(--line)] hover:border-[color:var(--accent-2)]/50 shadow-sm"
              }`}
            >
              {isHighlyRecommended && (
                <div className="absolute -top-3 left-6 rounded-full bg-[color:var(--accent)] px-3 py-0.5 text-[10px] font-extrabold tracking-wider text-white shadow-sm">
                  最佳心意首選
                </div>
              )}

              <div className="flex items-center justify-between gap-2 border-b border-[color:var(--line)]/60 pb-3 mb-4 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[color:var(--accent)]/10 border border-[color:var(--accent)]/30 flex items-center justify-center text-[10px] font-bold text-[color:var(--accent)]">
                    ❀
                  </div>
                  <div>
                    <p className="text-[9px] text-[color:var(--muted)] uppercase tracking-wider">
                      核心花材
                    </p>
                    <p className="text-[11px] font-semibold text-[color:var(--foreground)] truncate max-w-[90px]">
                      {r.card.tags.flowers[0] ?? "綜合壓花"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-[color:var(--muted)] uppercase tracking-wider">
                    契合度
                  </p>
                  <p className="text-xs font-bold text-[color:var(--accent)]">{r.score}%</p>
                </div>
              </div>

              <CardProductImage card={r.card} />
              <div className="mb-4 flex items-start justify-between gap-2 border-b border-[color:var(--line)]/50 pb-3">
                <div>
                  <p className="text-sm font-[family-name:var(--font-display)] font-bold tracking-wide">
                    {r.card.title}
                  </p>
                  <p className="text-[10px] text-[color:var(--muted)] mt-0.5">
                    {r.card.size ?? "植物標本"}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg border border-[color:var(--line)] bg-[color:var(--background)] px-2 py-0.5 text-[9px] font-semibold text-[color:var(--muted)]">
                  #{r.card.tags.moods[0] ?? "祝福"}
                </span>
              </div>

              {cardStoryText(r.card) ? (
                <div className="mb-4 rounded-2xl bg-[color:var(--background)]/60 p-3.5 border border-[color:var(--line)]/50">
                  <span className="text-[9px] font-bold text-[color:var(--muted)] uppercase tracking-wider block mb-1.5">
                    作品設計理念
                  </span>
                  <p
                    className={`text-xs leading-relaxed text-[color:var(--foreground)] whitespace-pre-line ${
                      expandedCardId === r.card.id ? "" : "line-clamp-4"
                    }`}
                  >
                    {cardStoryText(r.card)}
                  </p>
                </div>
              ) : null}

              <div className="mb-4 rounded-2xl bg-[color:var(--background)]/60 p-3.5 border border-[color:var(--line)]/50 grow">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[11px]">💡</span>
                  <span className="text-[11px] font-bold text-[color:var(--foreground)]/80 tracking-wider">
                    為何推薦這張
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[color:var(--muted)]">
                  {r.why?.trim() &&
                  !/^[.．…\-—_~～]+$/.test(r.why.trim()) &&
                  r.why.trim() !== "..."
                    ? r.why.trim()
                    : "依您的送禮情境，這張作品最貼近需求。"}
                </p>
              </div>

              {expandedCardId === r.card.id && (
                <div className="mb-4 border-t border-[color:var(--line)]/60 pt-3 animate-fade-in text-left grid gap-2.5 bg-[color:var(--background)]/30 rounded-2xl p-3 border border-[color:var(--line)]/40">
                  <div>
                    <span className="text-[9px] text-[color:var(--muted)] uppercase block">花材</span>
                    <span className="text-[11px] font-medium text-[color:var(--foreground)] mt-0.5 block leading-relaxed">
                      {r.card.tags.flowers.join("、")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[color:var(--line)]/30">
                    <div>
                      <span className="text-[9px] text-[color:var(--muted)] uppercase block">
                        適用場合
                      </span>
                      <span className="text-[11px] font-medium text-[color:var(--foreground)] block truncate">
                        {r.card.tags.occasions.join("、") || "通用送禮"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[color:var(--muted)] uppercase block">
                        傳遞心意
                      </span>
                      <span className="text-[11px] font-medium text-[color:var(--foreground)] block truncate">
                        {r.card.tags.moods.join("、") || "溫暖期盼"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-baseline justify-between border-t border-[color:var(--line)]/40 pt-3 mt-auto">
                <span className="text-xs font-medium text-[color:var(--muted)]">定價預估</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-[11px] font-bold text-[color:var(--foreground)]">NT$</span>
                  <span className="text-lg font-extrabold tracking-tight text-[color:var(--foreground)]">
                    {r.card.priceTwd}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedCardId((s) => (s === r.card.id ? null : r.card.id));
                  }}
                  className={`h-10 rounded-xl border text-xs font-semibold tracking-wide transition-all flex items-center justify-center ${
                    expandedCardId === r.card.id
                      ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
                      : "border-[color:var(--line)] bg-transparent text-[color:var(--muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[color:var(--foreground)]"
                  }`}
                >
                  {expandedCardId === r.card.id ? "收起詳情" : "作品詳情"}
                </button>
                <Link
                  href={`/reserve?cardId=${encodeURIComponent(r.card.id)}`}
                  onClick={(e) => e.stopPropagation()}
                  className={`h-10 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center transition-all ${
                    isHighlyRecommended
                      ? "bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent)]/90 shadow-sm shadow-[color:var(--accent)]/20"
                      : "bg-[color:var(--ink)] text-[color:var(--paper)] hover:bg-black/85"
                  }`}
                >
                  立即預訂
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PHASE_HINTS: Record<Exclude<AnalyzePhase, "idle" | "done" | "error">, { title: string; detail: string; eta: string }> = {
  parsing: {
    title: "正在解析您的故事",
    detail: "先抓出送禮對象、場合、氣氛和花語關鍵字…",
    eta: "通常約 4–12 秒",
  },
  filling: {
    title: "正在整理需求欄位",
    detail: "我先把解析好的欄位一格一格填上，方便你馬上微調…",
    eta: "通常約 2–6 秒",
  },
  recommending: {
    title: "正在為您推薦卡片",
    detail: "正在比對作品資料庫，整理最適合你的三張推薦…",
    eta: "通常約 12–35 秒",
  },
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickTagsByKeywords(
  text: string,
  pool: readonly string[],
  pairs: Array<[RegExp, string]>
): string[] {
  const found: string[] = [];
  for (const [re, tag] of pairs) {
    if (re.test(text) && pool.includes(tag as (typeof pool)[number]) && !found.includes(tag)) {
      found.push(tag);
    }
  }
  return found;
}

function inferTagsFromStory(story: string) {
  const blob = story.trim();
  if (!blob) return { mood: [] as string[], meaning: [] as string[] };

  const meaning = pickTagsByKeywords(blob, FLOWER_MEANING_TAGS, [
    [/康復|早日好|早日恢復|療養|住院|手術|探病/, "康復"],
    [/平安|安康|順心|平順/, "平安"],
    [/健康|保重/, "健康"],
    [/祝福|祝賀|恭喜|賀喜/, "祝福"],
    [/感謝|謝謝|答謝/, "感謝"],
    [/希望|盼望|期待/, "希望"],
    [/鼓勵|加油|打氣|支持/, "鼓勵"],
    [/陪伴|陪你|陪在/, "陪伴"],
    [/思念|想念|懷念/, "思念"],
    [/守護|保護|照顧/, "守護"],
    [/堅強|堅韌|撐住/, "堅韌"],
    [/開心|喜悅|喜樂|快樂/, "喜悅"],
    [/真誠|誠摯|誠意/, "真誠"],
    [/長壽|福壽|延年/, "長壽"],
  ]);

  const mood = pickTagsByKeywords(blob, MOOD_ATMOSPHERE_TAGS, [
    [/溫柔|柔和|柔軟/, "溫柔"],
    [/沉靜|沉穩|安靜|寧靜/, "沉靜"],
    [/安定|安心|穩定|穩重/, "安定"],
    [/輕盈|輕快|清爽/, "輕盈"],
    [/療癒|治癒|撫慰/, "療癒"],
    [/明亮|亮麗|朝氣|活力/, "明亮"],
    [/典雅|優雅|高雅/, "典雅"],
    [/清新|自然|乾淨/, "清新"],
  ]);

  return { mood, meaning };
}

function ensureConsultantClosing(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "我整理好你的需求囉！所以我推薦以下三張卡片給你！";
  if (/所以我推薦以下三張卡片給[你您]/.test(trimmed)) return trimmed;
  const suffix = /[。！？～~]$/.test(trimmed) ? "" : "！";
  return `${trimmed}${suffix}所以我推薦以下三張卡片給你！`;
}

export function RecommendForm() {
  const [form, setForm] = useState<Input>({
    recipient: "",
    occasion: "",
    mood: "",
    story: "",
    budget: "",
    color: "",
    flowerMeaning: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [results, setResults] = useState<
    Array<{ card: Card; score: number; why: string }>
  >([]);
  const [engine, setEngine] = useState<string>("");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [loadingMode, setLoadingMode] = useState<"analyze" | "refine" | null>(null);
  const [analyzePhase, setAnalyzePhase] = useState<AnalyzePhase>("idle");
  const loading = loadingMode !== null;
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [fieldsFromAi, setFieldsFromAi] = useState(false);
  const [consultantReply, setConsultantReply] = useState("");
  const [meaningTags, setMeaningTags] = useState<string[]>([]);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      text: "請先告訴我您的送禮情境，我會先幫您解析重點，再推薦三張卡片！",
    },
  ]);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [floatingBubbleText, setFloatingBubbleText] = useState("");
  const [showFloatingBubble, setShowFloatingBubble] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const chatPanelRef = useRef<HTMLDivElement | null>(null);
  const storySectionRef = useRef<HTMLDivElement | null>(null);

  const hasStructuredInput = useMemo(() => {
    const textFields = [
      form.recipient,
      form.occasion,
      form.mood,
      form.color,
      form.flowerMeaning,
    ].some((x) => Boolean(x && String(x).trim()));
    const hasBudget =
      form.budget !== undefined &&
      form.budget !== "" &&
      String(form.budget).trim() !== "";
    return textFields || hasBudget;
  }, [form]);

  const syncTagsFromFields = (
    flowerMeaning?: string,
    mood?: string,
    storyForFallback?: string
  ) => {
    let nextMeaningTags = meaningTagsFromField(flowerMeaning);
    let nextMoodTags = moodTagsFromField(mood);

    if (storyForFallback && nextMeaningTags.length === 0 && nextMoodTags.length === 0) {
      const inferred = inferTagsFromStory(storyForFallback);
      nextMeaningTags = inferred.meaning;
      nextMoodTags = inferred.mood;
    }

    setMeaningTags(nextMeaningTags);
    setMoodTags(nextMoodTags);
    setForm((s) => ({
      ...s,
      flowerMeaning: nextMeaningTags.length ? joinTagsToField(nextMeaningTags) : (flowerMeaning ?? ""),
      mood: nextMoodTags.length ? joinTagsToField(nextMoodTags) : (mood ?? ""),
    }));
  };

  const parseApiError = async (res: Response) => {
    let msg = "推薦請求失敗，請稍後再試。";
    try {
      const errBody = await res.json();
      if (errBody?.error === "llm_unavailable") {
        return errBody?.message ?? LLM_UNAVAILABLE_MSG;
      }
      if (errBody?.error === "llm_parse_failed") {
        return errBody?.message ?? "AI 解析失敗，請調整描述後再試。";
      }
      if (typeof errBody?.message === "string") msg = errBody.message;
    } catch {
      /* ignore */
    }
    return msg;
  };

  const applyFieldsStepByStep = async (fields: {
    recipient?: string;
    occasion?: string;
    mood?: string;
    budget?: number;
    color?: string;
    flowerMeaning?: string;
  }) => {
    setAnalyzePhase("filling");
    const steps: Array<() => void> = [
      () => setForm((s) => ({ ...s, recipient: fields.recipient ?? "" })),
      () => setForm((s) => ({ ...s, occasion: fields.occasion ?? "" })),
      () => setForm((s) => ({ ...s, mood: fields.mood ?? "" })),
      () => setForm((s) => ({ ...s, flowerMeaning: fields.flowerMeaning ?? "" })),
      () =>
        setForm((s) => ({
          ...s,
          budget:
            typeof fields.budget === "number" && fields.budget > 0
              ? String(fields.budget)
              : "",
        })),
      () => setForm((s) => ({ ...s, color: fields.color ?? "" })),
    ];

    for (const step of steps) {
      step();
      await sleep(240);
    }

    syncTagsFromFields(fields.flowerMeaning, fields.mood, form.story?.trim());
    setFieldsFromAi(true);
    setHasAnalyzed(true);
  };

  const runAnalyze = async () => {
    const story = form.story?.trim();
    if (!story) {
      setErrors((e) => ({ ...e, story: "請先輸入左側情境描述" }));
      return;
    }

    setErrors((e) => {
      const next = { ...e };
      delete next.story;
      delete next.form;
      return next;
    });

    setLoadingMode("analyze");
    setAnalyzePhase("parsing");
    setExpandedCardId(null);
    setShowScrollHint(false);
    setShowFloatingBubble(false);
    setResults([]);
    setConsultantReply("");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: story,
    };
    setChatMessages((prev) => {
      const withoutWelcome =
        prev.length === 1 && prev[0]?.id === "assistant-welcome" ? [] : prev;
      return [...withoutWelcome, userMessage];
    });

    try {
      const parseRes = await fetch("/api/parse-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story }),
      });

      if (!parseRes.ok) {
        const errMsg = await parseApiError(parseRes);
        setErrors((e) => ({ ...e, form: errMsg }));
        setAnalyzePhase("error");
        return;
      }

      const parsedFields = await parseRes.json();
      await applyFieldsStepByStep(parsedFields);

      setAnalyzePhase("recommending");

      const recommendRes = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "refine",
          story,
          recipient: parsedFields.recipient,
          occasion: parsedFields.occasion,
          mood: parsedFields.mood,
          flowerMeaning: parsedFields.flowerMeaning,
          budget: parsedFields.budget,
          color: parsedFields.color,
        }),
      });

      if (!recommendRes.ok) {
        const errMsg = await parseApiError(recommendRes);
        setErrors((e) => ({ ...e, form: errMsg }));
        if (recommendRes.status === 503) setResults([]);
        setAnalyzePhase("error");
        return;
      }

      const data = await recommendRes.json();
      const assistantText = ensureConsultantClosing(data.consultantReply ?? "");
      setConsultantReply(assistantText);
      setResults(data.recommendations ?? []);
      setEngine(data.engine ?? "");
      setChatMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: assistantText,
        },
      ]);
      setAnalyzePhase("done");
      const hasRecs = (data.recommendations ?? []).length > 0;
      setShowScrollHint(hasRecs);
      if (hasRecs) {
        setFloatingBubbleText(assistantText);
        setShowFloatingBubble(true);
        // Keep the conversation visible for a brief moment, then guide users to result cards.
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 240);
      }
    } catch (error) {
      console.error("analyze failed", error);
      setErrors((e) => ({
        ...e,
        form: "無法連線推薦服務，請確認開發伺服器已啟動後再試。",
      }));
      setAnalyzePhase("error");
    } finally {
      setLoadingMode(null);
    }
  };

  const runRefine = async () => {
    if (loading) return;
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
    if (!hasStructuredInput) {
      setErrors((prev) => ({
        ...prev,
        form: "請在右側填寫至少一項條件，或先完成「AI 分析並推薦」。",
      }));
      return;
    }

    setErrors((e) => {
      const next = { ...e };
      delete next.form;
      return next;
    });
    setLoadingMode("refine");
    setAnalyzePhase("recommending");
    setExpandedCardId(null);
    setShowScrollHint(false);
    setShowFloatingBubble(false);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "refine",
          ...parsed.data,
          story: form.story?.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const assistantText = ensureConsultantClosing(data.consultantReply ?? consultantReply);
        setConsultantReply(assistantText);
        setResults(data.recommendations ?? []);
        setEngine(data.engine ?? "");
        setChatMessages((prev) => {
          const withoutLastAssistant =
            prev.length > 0 && prev[prev.length - 1]?.role === "assistant"
              ? prev.slice(0, -1)
              : prev;
          return [
            ...withoutLastAssistant,
            { id: `assistant-${Date.now()}`, role: "assistant", text: assistantText },
          ];
        });
        const hasRecs = (data.recommendations ?? []).length > 0;
        setShowScrollHint(hasRecs);
        if (hasRecs) {
          setFloatingBubbleText(assistantText);
          setShowFloatingBubble(true);
          // Re-run recommendation should preserve the same auto-focus behavior to results.
          setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 240);
        }
        setAnalyzePhase("done");
      } else {
        const errMsg = await parseApiError(res);
        setErrors((e) => ({ ...e, form: errMsg }));
        if (res.status === 503) setResults([]);
        setAnalyzePhase("error");
      }
    } catch (error) {
      console.error("refine failed", error);
      setErrors((e) => ({
        ...e,
        form: "無法連線推薦服務，請確認開發伺服器已啟動後再試。",
      }));
      setAnalyzePhase("error");
    } finally {
      setLoadingMode(null);
    }
  };

  const handleStoryEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || loading) return;
    e.preventDefault();
    void runAnalyze();
  };

  const inputClass =
    "h-11 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] transition-all";

  const progressContent =
    analyzePhase === "parsing" || analyzePhase === "filling" || analyzePhase === "recommending"
      ? PHASE_HINTS[analyzePhase]
      : null;

  return (
    <div className="mx-auto w-full max-w-6xl animate-fade-in">
      <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7 transition-all duration-300 hover:border-[color:var(--accent-2)]/40 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            STORY INPUT
          </p>
          <span className="rounded-full bg-[color:var(--accent)]/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[color:var(--accent)]">
            AI 情境推薦
          </span>
        </div>

        {errors.form ? (
          <p className="mt-4 rounded-xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 px-4 py-3 text-xs font-medium text-[color:var(--accent)]">
            {errors.form}
          </p>
        ) : null}

        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-stretch">
          <div ref={storySectionRef} className="grid gap-2 content-start">
            <label htmlFor="recommend-story" className="text-sm font-semibold tracking-wide">
              送禮情境自由描述
            </label>
            <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
              輸入一段話後按 <strong>AI 分析並推薦</strong>，或按 <strong>Enter</strong>（
              <strong>Shift+Enter</strong> 換行）。AI 會解析情境、填入右欄並顯示下方推薦。
            </p>
            <textarea
              id="recommend-story"
              className="min-h-[84px] w-full flex-1 rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-4 text-sm leading-relaxed outline-none transition-all resize-y focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] disabled:opacity-60"
              value={form.story ?? ""}
              onChange={(e) => {
                setFieldsFromAi(false);
                setForm((s) => ({ ...s, story: e.target.value }));
              }}
              onKeyDown={handleStoryEnter}
              placeholder="例：想送給即將畢業的摯友，預算 80 元，希望粉色调、帶鼓勵與希望的花語。"
              disabled={loading}
            />
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => void runAnalyze()}
              disabled={loading}
            >
              {loadingMode === "analyze" ? "AI 分析中…" : "AI 分析並推薦"}
            </Button>
            {errors.story ? (
              <p className="text-xs font-medium text-[color:var(--accent)]">{errors.story}</p>
            ) : null}

            <div
              ref={chatPanelRef}
              className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--background)]/50 p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" />
                <p className="text-xs font-semibold tracking-wide">花語顧問聊天室</p>
              </div>

              <div className="grid gap-3">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[color:var(--ink)] text-[color:var(--paper)]"
                          : "bg-[color:var(--accent)]/12 text-[color:var(--foreground)] border border-[color:var(--accent)]/20"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {progressContent ? (
                <div className="mt-3">
                  <RecommendLoadingProgress
                    phaseTitle={progressContent.title}
                    detail={progressContent.detail}
                    etaHint={progressContent.eta}
                  />
                </div>
              ) : null}

              {showScrollHint && results.length > 0 ? (
                <button
                  type="button"
                  onClick={() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] hover:bg-[color:var(--accent)]/15"
                >
                  <span className="inline-block animate-bounce">↓</span>
                  往下看推薦卡片
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {fieldsFromAi ? (
              <p className="rounded-xl border border-[color:var(--accent)]/25 bg-[color:var(--accent)]/5 px-3 py-2 text-[11px] text-[color:var(--accent)]">
                已由 AI 從左側敘述填入，您可微調後按「重新生成」。
              </p>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold tracking-wide">指定送禮對象</span>
                <input
                  className={inputClass}
                  value={form.recipient ?? ""}
                  onChange={(e) => {
                    setFieldsFromAi(false);
                    setForm((s) => ({ ...s, recipient: e.target.value }));
                  }}
                  placeholder="例：媽媽、戀人、摯友、自己…"
                  disabled={loading}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold tracking-wide">偏好場合</span>
                <select
                  className={inputClass}
                  value={form.occasion ?? ""}
                  onChange={(e) => {
                    setFieldsFromAi(false);
                    setForm((s) => ({ ...s, occasion: e.target.value }));
                  }}
                  disabled={loading}
                >
                  <option value="">不限場合</option>
                  {["生日", "畢業", "加油", "紀念日", "傷病", "日常"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <RecommendTagChips
              label="期望氛圍與情緒"
              hint="可微調"
              tags={MOOD_ATMOSPHERE_TAGS}
              selected={moodTags}
              disabled={loading}
              onChange={(sel, field) => {
                setFieldsFromAi(false);
                const deduped = sel.filter((t) => !meaningTags.includes(t));
                setMoodTags(deduped);
                setForm((s) => ({ ...s, mood: field }));
              }}
            />

            <RecommendTagChips
              label="期望花語／心意"
              hint="花語意涵 · 可微調"
              tags={FLOWER_MEANING_TAGS}
              selected={meaningTags}
              showHashPrefix
              disabled={loading}
              onChange={(sel, field) => {
                setFieldsFromAi(false);
                const deduped = sel.filter((t) => !moodTags.includes(t));
                setMeaningTags(deduped);
                setForm((s) => ({ ...s, flowerMeaning: field }));
              }}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold tracking-wide">理想預算上限</span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={String(form.budget ?? "")}
                  onChange={(e) => {
                    setFieldsFromAi(false);
                    setForm((s) => ({ ...s, budget: e.target.value }));
                  }}
                  placeholder="例：80"
                  disabled={loading}
                />
                {errors.budget ? (
                  <span className="text-xs font-semibold text-[color:var(--accent)]">
                    {errors.budget}
                  </span>
                ) : null}
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold tracking-wide">偏好色調</span>
                <input
                  className={inputClass}
                  value={form.color ?? ""}
                  onChange={(e) => {
                    setFieldsFromAi(false);
                    setForm((s) => ({ ...s, color: e.target.value }));
                  }}
                  placeholder="例：粉、白、黃、香檳色…"
                  disabled={loading}
                />
              </label>
            </div>

            <div className="mt-auto border-t border-[color:var(--line)]/60 pt-4">
              {loadingMode !== "refine" ? (
                <Button
                  type="button"
                  size="lg"
                  onClick={() => void runRefine()}
                  disabled={loading || (!hasAnalyzed && !hasStructuredInput)}
                  className="w-full"
                >
                  重新生成
                </Button>
              ) : null}
              {!hasAnalyzed && !hasStructuredInput && !loading ? (
                <p className="mt-2 text-[11px] text-[color:var(--muted)]">
                  請先完成左側「AI 分析並推薦」，或手動填寫右欄至少一項後再重新生成。
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {results.length > 0 ? (
        <div ref={resultsRef}>
          <RecommendResults
            results={results}
            engine={engine}
            expandedCardId={expandedCardId}
            setExpandedCardId={setExpandedCardId}
            onClearResults={() => {
              setResults([]);
              setEngine("");
              setConsultantReply("");
              setExpandedCardId(null);
              setShowScrollHint(false);
              setShowFloatingBubble(false);
            }}
          />
        </div>
      ) : null}

      {showFloatingBubble && floatingBubbleText ? (
        <button
          type="button"
          onClick={() =>
            (storySectionRef.current ?? chatPanelRef.current)?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
          className="fixed bottom-4 right-1 z-40 w-[220px] rounded-2xl border border-[color:var(--accent)]/35 bg-[color:var(--card)]/95 px-3 py-2 text-left shadow-lg backdrop-blur xl:right-2"
        >
          <p className="text-[9px] font-semibold tracking-wide text-[color:var(--accent)]">
            推薦完成
          </p>
          <p className="mt-1 max-h-24 overflow-y-auto pr-1 text-[11px] leading-relaxed text-[color:var(--foreground)]">
            {floatingBubbleText}
          </p>
        </button>
      ) : null}
    </div>
  );
}
