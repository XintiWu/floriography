"use client";

import type { ReactNode } from "react";

function highlightText(text: string, terms: string[]): ReactNode {
  if (!terms.length) return text;
  const escaped = terms
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  if (!escaped) return text;
  const parts = text.split(new RegExp(`(${escaped})`, "g"));
  return parts.map((part, i) =>
    terms.some((t) => part.includes(t)) ? (
      <span key={i} className="font-semibold text-[color:var(--accent)]">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export function RecommendConsultantBrief({
  story,
  consultantReply,
  highlightTerms = [],
}: {
  story?: string;
  consultantReply: string;
  highlightTerms?: string[];
}) {
  if (!consultantReply.trim()) return null;

  return (
    <div className="mt-10 animate-fade-in rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            ✦
          </span>
          <h2 className="text-base font-bold tracking-wide">花語顧問解析</h2>
        </div>
        {story?.trim() ? (
          <p className="max-w-md text-right text-[11px] italic leading-relaxed text-[color:var(--muted)]">
            「{story.trim().length > 48 ? `${story.trim().slice(0, 48)}…` : story.trim()}」
          </p>
        ) : null}
      </div>
      <p className="text-sm leading-relaxed text-[color:var(--foreground)]/90">
        {highlightText(consultantReply, highlightTerms)}
      </p>
    </div>
  );
}
