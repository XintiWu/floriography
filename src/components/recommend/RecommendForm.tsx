"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/Button";
import { RecommendLoadingProgress } from "@/components/recommend/RecommendLoadingProgress";
import type { Card } from "@/lib/types";

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

const LLM_UNAVAILABLE_MSG =
  "請先啟動 Ollama（ollama serve）、執行 ollama pull llama3.2:3b，並在 .env.local 設定 OLLAMA_MODEL=llama3.2:3b。";

function cardStoryText(card: Card): string {
  const d = card.description?.trim();
  if (d) return d;
  return card.blurb?.trim() ?? "";
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
            由本機 Ollama 從候選作品中精選；可微調右欄後按「重新生成」更新結果。
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
                    AI 推薦理由
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
  const loading = loadingMode !== null;
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [fieldsFromAi, setFieldsFromAi] = useState(false);

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

  const applyFieldsFromApi = (fields: {
    recipient?: string;
    occasion?: string;
    mood?: string;
    budget?: number;
    color?: string;
    flowerMeaning?: string;
  }) => {
    setForm((s) => ({
      ...s,
      recipient: fields.recipient ?? "",
      occasion: fields.occasion ?? "",
      mood: fields.mood ?? "",
      color: fields.color ?? "",
      flowerMeaning: fields.flowerMeaning ?? "",
      budget:
        typeof fields.budget === "number" && fields.budget > 0
          ? String(fields.budget)
          : "",
    }));
    setFieldsFromAi(true);
    setHasAnalyzed(true);
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
    setExpandedCardId(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "analyze", story }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fields) applyFieldsFromApi(data.fields);
        setResults(data.recommendations ?? []);
        setEngine(data.engine ?? "");
      } else {
        const errMsg = await parseApiError(res);
        setErrors((e) => ({ ...e, form: errMsg }));
        if (res.status === 503) setResults([]);
      }
    } catch (error) {
      console.error("analyze failed", error);
      setErrors((e) => ({
        ...e,
        form: "無法連線推薦服務，請確認開發伺服器已啟動後再試。",
      }));
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
    setExpandedCardId(null);
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
        setResults(data.recommendations ?? []);
        setEngine(data.engine ?? "");
      } else {
        const errMsg = await parseApiError(res);
        setErrors((e) => ({ ...e, form: errMsg }));
        if (res.status === 503) setResults([]);
      }
    } catch (error) {
      console.error("refine failed", error);
      setErrors((e) => ({
        ...e,
        form: "無法連線推薦服務，請確認開發伺服器已啟動後再試。",
      }));
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
          <div className="grid gap-2 content-start">
            <label htmlFor="recommend-story" className="text-sm font-semibold tracking-wide">
              送禮情境自由描述
            </label>
            <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
              輸入一段話後按 <strong>AI 分析並推薦</strong>，或按 <strong>Enter</strong>（
              <strong>Shift+Enter</strong> 換行）。AI 會解析情境、填入右欄並顯示下方推薦。
            </p>
            <textarea
              id="recommend-story"
              className="min-h-[320px] w-full flex-1 rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-4 text-sm leading-relaxed outline-none transition-all resize-y focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] disabled:opacity-60"
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
          </div>

          <div className="flex flex-col gap-5">
            {fieldsFromAi ? (
              <p className="rounded-xl border border-[color:var(--accent)]/25 bg-[color:var(--accent)]/5 px-3 py-2 text-[11px] text-[color:var(--accent)]">
                已由 AI 從左側敘述填入，您可微調後按「重新生成」。
              </p>
            ) : null}

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

            <div className="grid gap-5 sm:grid-cols-2">
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

              <label className="grid gap-2">
                <span className="text-sm font-semibold tracking-wide">期望氛圍與情緒</span>
                <select
                  className={inputClass}
                  value={form.mood ?? ""}
                  onChange={(e) => {
                    setFieldsFromAi(false);
                    setForm((s) => ({ ...s, mood: e.target.value }));
                  }}
                  disabled={loading}
                >
                  <option value="">不限氛圍</option>
                  {["溫柔", "祝福", "鼓勵", "希望", "思念", "安定", "療癒", "感謝"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold tracking-wide">期望花語／心意</span>
              <textarea
                className="min-h-[72px] w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-3 text-sm leading-relaxed outline-none resize-y focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] disabled:opacity-60"
                value={form.flowerMeaning ?? ""}
                onChange={(e) => {
                  setFieldsFromAi(false);
                  setForm((s) => ({ ...s, flowerMeaning: e.target.value }));
                }}
                placeholder="例：鼓勵、希望、感謝、思念…"
                disabled={loading}
              />
            </label>

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

        {loadingMode ? (
          <div className="mt-6">
            <RecommendLoadingProgress mode={loadingMode} />
          </div>
        ) : null}
      </div>

      {results.length > 0 ? (
        <RecommendResults
          results={results}
          engine={engine}
          expandedCardId={expandedCardId}
          setExpandedCardId={setExpandedCardId}
          onClearResults={() => {
            setResults([]);
            setEngine("");
            setExpandedCardId(null);
          }}
        />
      ) : null}
    </div>
  );
}
