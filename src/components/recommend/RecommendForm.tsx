"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/Button";
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
    Array<{ card: Card; score: number; why: string }>
  >([]);
  const [engine, setEngine] = useState<string>("");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
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
        console.error("API Response not ok");
      }
    } catch (error) {
      console.error("Failed to fetch recommendations", error);
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
                AI 智能解析完畢
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
              根據您的故事語意，為您精準試算契合度並給出深度的美學配對理由。
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

                {/* 卡片主視覺預覽區 */}
                <div className="relative w-full aspect-[4/3] rounded-2xl bg-gradient-to-br from-[color:var(--background)] to-[color:var(--card)] border border-[color:var(--line)] overflow-hidden mb-4 group-hover:shadow-inner transition-all flex flex-col items-center justify-center p-4">
                  <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_var(--line)_1px,_transparent_1px)] [background-size:16px_16px]" />
                  <div className="absolute -left-10 -top-10 w-32 h-32 rounded-full bg-[color:var(--accent-2)]/5 blur-xl" />
                  
                  <p className="relative z-10 text-base font-[family-name:var(--font-display)] font-bold tracking-wider text-[color:var(--foreground)] text-center group-hover:scale-105 transition-transform duration-300">
                    {r.card.title}
                  </p>
                  <p className="relative z-10 text-[11px] text-[color:var(--muted)] mt-1 tracking-wide text-center">
                    {r.card.size ?? "純手工植物標本創作"}
                  </p>

                  <span className="absolute bottom-2 left-2 rounded-lg bg-[color:var(--card)]/90 backdrop-blur px-2 py-0.5 text-[9px] font-semibold text-[color:var(--muted)] border border-[color:var(--line)]">
                    #{r.card.tags.moods[0] ?? "祝福"}
                  </span>
                </div>

                {/* AI 顧問專屬生成的繁體中文理由區塊 */}
                <div className="mb-4 rounded-2xl bg-[color:var(--background)]/60 p-3.5 border border-[color:var(--line)]/50 grow">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[11px]">💡</span>
                    <span className="text-[11px] font-bold text-[color:var(--foreground)]/80 tracking-wider">
                      專屬顧問評析
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[color:var(--muted)]">
                    {r.why}
                  </p>
                </div>

                {/* 動態內嵌展開的作品完整規格詳情 (不跳出頁面) */}
                {expandedCardId === r.card.id && (
                  <div className="mb-4 border-t border-[color:var(--line)]/60 pt-3 animate-fade-in text-left grid gap-2.5 bg-[color:var(--background)]/30 rounded-2xl p-3 border border-[color:var(--line)]/40">
                    <div>
                      <span className="text-[9px] font-bold text-[color:var(--muted)] uppercase tracking-wider block">
                        作品設計理念 / 故事介紹
                      </span>
                      <p className="text-xs leading-relaxed text-[color:var(--foreground)] mt-0.5">
                        {r.card.description ||
                          "設計師精心挑選高質感實體壓花，揉合純粹自然的美學視角，透過多層次手工藝將植物的永恆姿態溫柔封存。"}
                      </p>
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
    <div className="max-w-2xl mx-auto w-full animate-fade-in">
      <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7 transition-all duration-300 hover:border-[color:var(--accent-2)]/40 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            STORY INPUT
          </p>
          <span className="rounded-full bg-[color:var(--accent)]/10 px-2.5 py-0.5 text-[10px] font-bold text-[color:var(--accent)] tracking-wider">
            Step 1 / 語意填寫
          </span>
        </div>

        <div className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-semibold tracking-wide flex items-center gap-2">
              送禮情境自由描述 <span className="text-[11px] text-[color:var(--muted)] font-normal">(建議包含對象、故事或心願)</span>
            </span>
            <textarea
              className="min-h-[140px] w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] resize-none transition-all leading-relaxed"
              value={form.story ?? ""}
              onChange={(e) =>
                setForm((s) => ({ ...s, story: e.target.value }))
              }
              placeholder="說說您的送禮情境吧！例如：「想送給即將離職去追夢的同事，希望給她滿滿的勇氣和溫暖祝福...」AI 顧問會為您尋找最契合的花語作品。"
              disabled={loading}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold tracking-wide">
              指定送禮對象（選填）
            </span>
            <input
              className={inputClass}
              value={form.recipient ?? ""}
              onChange={(e) =>
                setForm((s) => ({ ...s, recipient: e.target.value }))
              }
              placeholder="例：媽媽、戀人、摯友、自己…"
              disabled={loading}
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold tracking-wide">
                偏好場合（選填）
              </span>
              <select
                className={inputClass}
                value={form.occasion ?? ""}
                onChange={(e) =>
                  setForm((s) => ({ ...s, occasion: e.target.value }))
                }
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
              <span className="text-sm font-semibold tracking-wide">
                期望氛圍與情緒（選填）
              </span>
              <select
                className={inputClass}
                value={form.mood ?? ""}
                onChange={(e) =>
                  setForm((s) => ({ ...s, mood: e.target.value }))
                }
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
              <span className="text-sm font-semibold tracking-wide">
                理想預算上限（選填）
              </span>
              <input
                className={inputClass}
                inputMode="numeric"
                value={String(form.budget ?? "")}
                onChange={(e) =>
                  setForm((s) => ({ ...s, budget: e.target.value }))
                }
                placeholder="例：1500"
                disabled={loading}
              />
              {errors.budget ? (
                <span className="text-xs font-semibold text-[color:var(--accent)]">
                  {errors.budget}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold tracking-wide">
                偏好色調（選填）
              </span>
              <input
                className={inputClass}
                value={form.color ?? ""}
                onChange={(e) =>
                  setForm((s) => ({ ...s, color: e.target.value }))
                }
                placeholder="例：粉、白、黃、香檳色…"
                disabled={loading}
              />
            </label>
          </div>

          {/* 底部按鈕列與等待狀態 */}
          <div className="pt-3 border-t border-[color:var(--line)]/60 mt-2">
            {loading ? (
              <div className="rounded-2xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 p-6 text-center transition-all animate-pulse">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent mb-3" />
                <p className="text-sm font-bold tracking-wide text-[color:var(--accent)]">
                  正在調閱花語辭典...
                </p>
                <p className="text-xs text-[color:var(--muted)] mt-1">
                  正在背景呼叫 Ollama (gemma4:e4b) 進行深度語意推演，請稍候片刻。
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-[color:var(--muted)] order-2 sm:order-1 text-center sm:text-left">
                  按下按鈕後，AI 顧問將為您過濾目錄並產生專屬繁體中文評析。
                </p>
                <Button
                  type="button"
                  size="lg"
                  onClick={recommend}
                  disabled={!canRecommend || loading}
                  className="w-full sm:w-auto order-1 sm:order-2 shrink-0"
                >
                  探索專屬推薦
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
