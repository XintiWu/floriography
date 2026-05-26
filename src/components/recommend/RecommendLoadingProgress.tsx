"use client";

import { useEffect, useState } from "react";

type ProgressStep = {
  phaseTitle?: string;
  detail: string;
  durationMs: number;
};

const ANALYZE_STEPS: ProgressStep[] = [
  {
    phaseTitle: "正在將您的送禮情境解析成欄位",
    detail: "正在解析：指定送禮對象",
    durationMs: 2200,
  },
  { detail: "正在解析：偏好場合", durationMs: 2000 },
  { detail: "正在解析：期望氛圍與情緒", durationMs: 2000 },
  { detail: "正在解析：期望花語／心意", durationMs: 2200 },
  { detail: "正在解析：理想預算上限", durationMs: 2000 },
  { detail: "正在解析：偏好色調", durationMs: 2000 },
  {
    phaseTitle: "正在依照情境推薦卡片",
    detail: "正在從作品庫粗排候選…",
    durationMs: 2800,
  },
  { detail: "正在比對分數…", durationMs: 3200 },
  { detail: "AI 精選最適合的 3 張卡片…", durationMs: 3500 },
  { detail: "正在撰寫推薦理由…", durationMs: 4000 },
];

const REFINE_STEPS: ProgressStep[] = [
  {
    phaseTitle: "正在依照右欄條件推薦卡片",
    detail: "正在從作品庫粗排候選…",
    durationMs: 2500,
  },
  { detail: "正在比對分數…", durationMs: 3000 },
  { detail: "AI 精選最適合的 3 張卡片…", durationMs: 3500 },
  { detail: "正在撰寫推薦理由…", durationMs: 4000 },
];

function buildPhaseTitle(stepIndex: number, steps: ProgressStep[]): string {
  for (let i = stepIndex; i >= 0; i--) {
    if (steps[i]?.phaseTitle) return steps[i].phaseTitle!;
  }
  return "處理中…";
}

export function RecommendLoadingProgress({
  mode,
}: {
  mode: "analyze" | "refine";
}) {
  const steps = mode === "analyze" ? ANALYZE_STEPS : REFINE_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setStepIndex(0);
    setProgress(2);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    for (let i = 0; i < steps.length; i++) {
      const idx = i;
      timers.push(
        setTimeout(() => {
          setStepIndex(idx);
          const ratio = (idx + 1) / steps.length;
          setProgress(Math.min(92, Math.round(ratio * 92)));
        }, elapsed)
      );
      elapsed += steps[i].durationMs;
    }

    timers.push(
      setTimeout(() => {
        setProgress((p) => Math.max(p, 94));
      }, elapsed)
    );

    return () => timers.forEach(clearTimeout);
  }, [mode, steps]);

  const phaseTitle = buildPhaseTitle(stepIndex, steps);
  const detail = steps[stepIndex]?.detail ?? "";
  const etaHint =
    mode === "analyze"
      ? "本機 AI 約需 15–40 秒，請稍候"
      : "重新推薦約需 10–25 秒";

  return (
    <div
      className="rounded-2xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 p-5"
      role="status"
      aria-live="polite"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[color:var(--accent)]">{phaseTitle}</p>
        <span className="text-[11px] font-semibold tabular-nums text-[color:var(--muted)]">
          {progress}%
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--line)]">
        <div
          className="h-full rounded-full bg-[color:var(--accent)] transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[color:var(--foreground)]/85">
        {detail}
      </p>
      <p className="mt-2 text-[10px] text-[color:var(--muted)]">{etaHint}</p>
    </div>
  );
}
