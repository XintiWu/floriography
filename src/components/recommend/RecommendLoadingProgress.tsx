"use client";

export function RecommendLoadingProgress({
  phaseTitle,
  detail,
  etaHint,
}: {
  phaseTitle: string;
  detail: string;
  etaHint?: string;
}) {
  return (
    <div
      className="rounded-2xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 p-5"
      role="status"
      aria-live="polite"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[color:var(--accent)]">{phaseTitle}</p>
        <span className="inline-flex gap-1" aria-label="載入中">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[color:var(--accent)] [animation-delay:-0.24s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[color:var(--accent)] [animation-delay:-0.12s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[color:var(--accent)]" />
        </span>
      </div>

      <div className="flex min-h-[54px] items-start gap-3 rounded-xl border border-[color:var(--line)]/70 bg-[color:var(--card)]/80 px-3 py-3">
        <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--accent)]/70" />
        <p className="text-xs leading-relaxed text-[color:var(--foreground)]/90">
          {detail}
          <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-[color:var(--accent)]/70 align-middle" />
        </p>
      </div>

      {etaHint ? <p className="mt-2 text-[10px] text-[color:var(--muted)]">{etaHint}</p> : null}
    </div>
  );
}
