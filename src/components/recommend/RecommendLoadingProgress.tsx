"use client";

import { useEffect, useState } from "react";

type ProgressStep = {
  phaseTitle?: string;
  detail: string;
  durationMs: number;
};

const ANALYZE_STEPS: ProgressStep[] = [
  {
    phaseTitle: "正在理解您的送禮情境",
    detail: "解析送禮對象、場合與心意關鍵字…",
    durationMs: 3500,
  },
  {
    phaseTitle: "花語顧問正在撰寫專屬解析",
    detail: "說明適合的花材意象與送禮理由…",
    durationMs: 4500,
  },
  {
    phaseTitle: "正在精選最適合的作品",
    detail: "從作品庫比對分數並挑選候選…",
    durationMs: 4000,
  },
  {
    phaseTitle: "正在完成推薦說明",
    detail: "為每張作品撰寫專屬推薦理由…",
    durationMs: 4500,
  },
];

const REFINE_STEPS: ProgressStep[] = [
  {
    phaseTitle: "正在依您微調的標籤重新理解需求",
    detail: "更新花語意涵與情緒氛圍條件…",
    durationMs: 3000,
  },
  {
    phaseTitle: "更新花語顧問解析",
    detail: "依微調後條件重寫顧問建議…",
    durationMs: 4000,
  },
  {
    phaseTitle: "重新精選推薦作品",
    detail: "比對作品庫並更新三張推薦…",
    durationMs: 4500,
  },
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
      ? "本機 AI 約需 15–45 秒，請稍候"
      : "重新推薦約需 12–30 秒";

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
