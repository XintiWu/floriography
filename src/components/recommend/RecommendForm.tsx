"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/Button";
import { parseStoryWithRules } from "@/lib/parseStoryRules";
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
});

type Input = z.input<typeof schema>;

/** 同學校訂的完整敘述（description），無則退回 blurb */
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

export function RecommendForm() {
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
    Array<{ card: Card; score: number; why: string }>
  >([]);
  const [engine, setEngine] = useState<string>("");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldsAutoFilled, setFieldsAutoFilled] = useState(false);

  const hasStructuredInput = useMemo(() => {
    const textFields = [form.recipient, form.occasion, form.mood, form.color].some(
      (x) => Boolean(x && String(x).trim())
    );
    const hasBudget =
      form.budget !== undefined &&
      form.budget !== "" &&
      String(form.budget).trim() !== "";
    return textFields || hasBudget;
  }, [form]);

  const canRecommend = useMemo(() => {
    const parsed = schema.safeParse(form);
    return parsed.success && hasStructuredInput;
  }, [form, hasStructuredInput]);

  /** 本機關鍵字規則解析，不經 API、不等待 LLM */
  const parseStoryToFields = () => {
    const story = form.story?.trim();
    if (!story) {
      setErrors((e) => ({ ...e, story: "請先輸入左側情境描述" }));
      return;
    }
    setErrors((e) => {
      const next = { ...e };
      delete next.story;
      return next;
    });
    const data = parseStoryWithRules(story);
    setForm((s) => ({
      ...s,
      recipient: data.recipient ?? s.recipient ?? "",
      occasion: data.occasion ?? s.occasion ?? "",
      mood: data.mood ?? s.mood ?? "",
      color: data.color ?? s.color ?? "",
      budget:
        typeof data.budget === "number" && data.budget > 0
          ? String(data.budget)
          : s.budget ?? "",
    }));
    setFieldsAutoFilled(true);
    if (
      !data.recipient &&
      !data.occasion &&
      !data.mood &&
      !data.color &&
      !data.budget
    ) {
      setErrors((e) => ({
        ...e,
        story: "未能從描述中辨識欄位，請改用手動填寫右側，或補上對象／場合／預算／色調等關鍵字。",
      }));
    }
  };

  const handleStoryEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    parseStoryToFields();
  };

  const handleRecommendClick = () => {
    if (loading) return;
    if (!hasStructuredInput) {
      setErrors((prev) => ({
        ...prev,
        form: "請填寫右側至少一項（對象、場合、情緒、預算或色調），或先按「自動填入」。",
      }));
      return;
    }
    void recommend();
  };

  const recommend = async () => {
    setErrors((e) => {
      const next = { ...e };
      delete next.form;
      return next;
    });
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
    setResults([]); // 清空先前的結果
    setEngine("");
    setExpandedCardId(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.recommendations ?? []);
        setEngine(data.engine ?? "");
      } else {
        let msg = "推薦請求失敗，請稍後再試。";
        try {
          const errBody = await res.json();
          if (typeof errBody?.message === "string") msg = errBody.message;
        } catch {
          /* ignore */
        }
        setErrors((e) => ({ ...e, form: msg }));
      }
    } catch (error) {
      console.error("Failed to fetch recommendations", error);
      setErrors((e) => ({
        ...e,
        form: "無法連線推薦服務，請確認開發伺服器已啟動後再試。",
      }));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-11 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] transition-all";

  // 若產生了結果，隱藏 Input form，展示媲美 NFT 平台風格的高光作品陣列
  if (results.length > 0) {
    return (
      <div className="flex flex-col gap-8 animate-fade-in">
        {/* 頂部導覽控制與顧問標頭列 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[color:var(--line)] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[color:var(--accent)]/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[color:var(--accent)] border border-[color:var(--accent)]/20">
                情境解析完畢
              </span>
              {engine && (
                <span className="rounded-full bg-[color:var(--ink)] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[color:var(--paper)] shadow-sm">
                  ⚡ {engine}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold tracking-wide mt-2">
              專屬花藝解答與推薦作品
            </h2>
            <p className="text-xs text-[color:var(--muted)] mt-0.5">
              依文字探勘比對花材、花語與情境索引；若已啟用雲端或本機模型，會在粗排結果上再精選與潤飾理由。
            </p>
          </div>

          <button
            onClick={() => setResults([])}
            className="h-10 px-4 rounded-full border border-[color:var(--line)] bg-[color:var(--card)]/80 text-xs font-semibold tracking-wide text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
          >
            <span>←</span>
            <span>修改送禮需求 / 回到上一步</span>
          </button>
        </div>

        {/* 推薦卡片陣列 (完全採納使用者 Reference 圖面的高質感網格設計) */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r, index) => {
            // 首張卡片套用極致高光邊框與專屬推薦徽章 (致敬 Reference 圖面中央發光卡片)
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
                {/* 最佳適性推薦 Badge */}
                {isHighlyRecommended && (
                  <div className="absolute -top-3 left-6 rounded-full bg-[color:var(--accent)] px-3 py-0.5 text-[10px] font-extrabold tracking-wider text-white shadow-sm">
                    ⭐ 最佳心意首選
                  </div>
                )}

                {/* 上方調性標記列 */}
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
                      契合度評分
                    </p>
                    <p className="text-xs font-bold text-[color:var(--accent)]">
                      {r.score}%
                    </p>
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

                {/* 同學撰寫的作品故事（來自 card.description） */}
                {cardStoryText(r.card) ? (
                  <div className="mb-4 rounded-2xl bg-[color:var(--background)]/60 p-3.5 border border-[color:var(--line)]/50">
                    <span className="text-[9px] font-bold text-[color:var(--muted)] uppercase tracking-wider block mb-1.5">
                      作品設計理念 / 故事介紹
                    </span>
                    <p
                      className={`text-xs leading-relaxed text-[color:var(--foreground)] whitespace-pre-line ${
                        expandedCardId === r.card.id ? "" : "line-clamp-4"
                      }`}
                    >
                      {cardStoryText(r.card)}
                    </p>
                    {expandedCardId !== r.card.id &&
                    cardStoryText(r.card).length > 120 ? (
                      <p className="text-[10px] text-[color:var(--muted)] mt-2">
                        點「作品詳情」可閱讀完整內容與花材標籤
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {/* 推薦理由（文字探勘 / 模型生成，與作品故事不同） */}
                <div className="mb-4 rounded-2xl bg-[color:var(--background)]/60 p-3.5 border border-[color:var(--line)]/50 grow">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[11px]">💡</span>
                    <span className="text-[11px] font-bold text-[color:var(--foreground)]/80 tracking-wider">
                      為何推薦給您
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[color:var(--muted)]">
                    {r.why}
                  </p>
                </div>

                {/* 動態內嵌展開的作品完整規格詳情 (不跳出頁面) */}
                {expandedCardId === r.card.id && (
                  <div className="mb-4 border-t border-[color:var(--line)]/60 pt-3 animate-fade-in text-left grid gap-2.5 bg-[color:var(--background)]/30 rounded-2xl p-3 border border-[color:var(--line)]/40">
                    <div className="pt-0.5">
                      <span className="text-[9px] text-[color:var(--muted)] uppercase block">花材</span>
                      <span className="text-[11px] font-medium text-[color:var(--foreground)] mt-0.5 block leading-relaxed">
                        {r.card.tags.flowers.join("、")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[color:var(--line)]/30">
                      <div>
                        <span className="text-[9px] text-[color:var(--muted)] uppercase block">適用場合</span>
                        <span className="text-[11px] font-medium text-[color:var(--foreground)] block truncate">
                          {r.card.tags.occasions.join("、") || "通用送禮"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[color:var(--muted)] uppercase block">傳遞心意</span>
                        <span className="text-[11px] font-medium text-[color:var(--foreground)] block truncate">
                          {r.card.tags.moods.join("、") || "溫暖期盼"}
                        </span>
                      </div>
                    </div>

                    {r.card.tags.colors?.length > 0 && (
                      <div className="pt-0.5">
                        <span className="text-[9px] text-[color:var(--muted)] uppercase block">視覺主色系</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.card.tags.colors.map((c) => (
                            <span
                              key={c}
                              className="rounded bg-[color:var(--foreground)]/5 px-1.5 py-0.5 text-[10px] text-[color:var(--muted)]"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 價格列與計算式展示 */}
                <div className="flex items-baseline justify-between border-t border-[color:var(--line)]/40 pt-3 mt-auto">
                  <span className="text-xs font-medium text-[color:var(--muted)]">
                    定價預估
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[11px] font-bold text-[color:var(--foreground)]">
                      NT$
                    </span>
                    <span className="text-lg font-extrabold tracking-tight text-[color:var(--foreground)]">
                      {r.card.priceTwd}
                    </span>
                  </div>
                </div>

                {/* 底部按鈕列 (內嵌展開按鈕與預訂雙按鈕) */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-1">
                  <button
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

        {/* 底部聯絡資訊與回退列 */}
        <div className="mt-4 rounded-3xl border border-[color:var(--line)]/60 bg-[color:var(--card)]/40 p-5 text-center">
          <p className="text-xs text-[color:var(--muted)]">
            找不到符合期待的專屬作品嗎？歡迎嘗試{" "}
            <button
              onClick={() => setResults([])}
              className="font-semibold text-[color:var(--accent)] underline underline-offset-2 hover:text-[color:var(--accent-2)] transition-colors"
            >
              微調您的情境故事
            </button>{" "}
            ，或直接聯絡設計師進行客製化諮詢。
          </p>
        </div>
      </div>
    );
  }

  // 預設展示的 Input form (當處於未推論或重新填寫狀態時)
  return (
    <div className="mx-auto w-full max-w-6xl animate-fade-in">
      <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7 transition-all duration-300 hover:border-[color:var(--accent-2)]/40 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            STORY INPUT
          </p>
          <span className="rounded-full bg-[color:var(--accent)]/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[color:var(--accent)]">
            Step 1 / 語意填寫
          </span>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-stretch">
          {/* 左欄：自然語言敘述（勿用 label 包住按鈕，避免點擊失效） */}
          <div className="grid gap-2 content-start">
            <label htmlFor="recommend-story" className="text-sm font-semibold tracking-wide">
              送禮情境自由描述
            </label>
            <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
              輸入一段話後按 <strong>自動填入</strong>（本機關鍵字辨識、即時完成），或按 <strong>Enter</strong>（<strong>Shift+Enter</strong> 換行）。也可直接填寫右欄後推薦。
            </p>
            <textarea
              id="recommend-story"
              className="min-h-[320px] w-full flex-1 rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-4 text-sm leading-relaxed outline-none transition-all resize-y focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] disabled:opacity-60"
              value={form.story ?? ""}
              onChange={(e) => {
                setFieldsAutoFilled(false);
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
              onClick={parseStoryToFields}
              disabled={loading}
            >
              自動填入
            </Button>
            {errors.story ? (
              <p className="text-xs font-medium text-[color:var(--accent)]">{errors.story}</p>
            ) : null}
          </div>

          {/* 右欄：五格結構化條件 */}
          <div className="flex flex-col gap-5">
            {fieldsAutoFilled ? (
              <p className="rounded-xl border border-[color:var(--accent)]/25 bg-[color:var(--accent)]/5 px-3 py-2 text-[11px] text-[color:var(--accent)]">
                已用本機關鍵字從左側敘述填入，您仍可修改右側任一欄位。
              </p>
            ) : null}

            <label className="grid gap-2">
              <span className="text-sm font-semibold tracking-wide">指定送禮對象</span>
              <input
                className={inputClass}
                value={form.recipient ?? ""}
                onChange={(e) => {
                  setFieldsAutoFilled(false);
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
                    setFieldsAutoFilled(false);
                    setForm((s) => ({ ...s, occasion: e.target.value }));
                  }}
                  disabled={loading}
                >
                  <option value="">不限場合</option>
                  {["生日", "畢業", "加油", "紀念日", "日常"].map((x) => (
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
                    setFieldsAutoFilled(false);
                    setForm((s) => ({ ...s, mood: e.target.value }));
                  }}
                  disabled={loading}
                >
                  <option value="">不限氛圍</option>
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
                <span className="text-sm font-semibold tracking-wide">理想預算上限</span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={String(form.budget ?? "")}
                  onChange={(e) => {
                    setFieldsAutoFilled(false);
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
                    setFieldsAutoFilled(false);
                    setForm((s) => ({ ...s, color: e.target.value }));
                  }}
                  placeholder="例：粉、白、黃、香檳色…"
                  disabled={loading}
                />
              </label>
            </div>

            <div className="mt-auto border-t border-[color:var(--line)]/60 pt-4">
              {errors.form ? (
                <p className="mb-3 text-xs font-medium text-[color:var(--accent)]">
                  {errors.form}
                </p>
              ) : null}
              {!hasStructuredInput && !loading ? (
                <p className="mb-3 text-[11px] text-[color:var(--muted)]">
                  請填寫右側至少一項，或於左側輸入後按「自動填入」。
                </p>
              ) : null}
              {loading ? (
                <div className="rounded-2xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 p-6 text-center animate-pulse">
                  <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
                  <p className="text-sm font-bold text-[color:var(--accent)]">正在比對五格條件…</p>
                </div>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={handleRecommendClick}
                  disabled={loading}
                  className={`w-full ${!canRecommend && !loading ? "opacity-70" : ""}`}
                >
                  探索專屬推薦
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
