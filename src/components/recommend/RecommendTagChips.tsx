"use client";

import { joinTagsToField } from "@/data/recommendTagOptions";

type RecommendTagChipsProps = {
  label: string;
  hint?: string;
  tags: readonly string[];
  selected: string[];
  onChange: (selected: string[], fieldValue: string) => void;
  customValue?: string;
  onCustomChange?: (custom: string, fieldValue: string) => void;
  showHashPrefix?: boolean;
  disabled?: boolean;
};

export function RecommendTagChips({
  label,
  hint,
  tags,
  selected,
  onChange,
  customValue = "",
  onCustomChange,
  showHashPrefix = false,
  disabled = false,
}: RecommendTagChipsProps) {
  const toggle = (tag: string) => {
    if (disabled) return;
    const next = selected.includes(tag)
      ? selected.filter((t) => t !== tag)
      : [...selected, tag];
    const field = onCustomChange
      ? mergeField(next, customValue)
      : joinTagsToField(next);
    onChange(next, field);
  };

  const mergeField = (sel: string[], custom: string) => {
    const known = joinTagsToField(sel);
    const extra = custom.trim();
    if (known && extra) return `${known}、${extra}`;
    return known || extra;
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold tracking-wide">{label}</span>
        {hint ? (
          <span className="text-[10px] text-[color:var(--muted)]">{hint}</span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() => toggle(tag)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-all ${
                active
                  ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--paper)]"
                  : "border-[color:var(--line)] bg-[color:var(--card)] text-[color:var(--muted)] hover:border-[color:var(--accent)]/40"
              } disabled:opacity-50`}
            >
              {showHashPrefix ? `#${tag}` : tag}
            </button>
          );
        })}
      </div>
      {onCustomChange ? (
        <input
          type="text"
          className="h-9 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--background)]/60 px-3 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] disabled:opacity-50"
          placeholder="其他（選填）"
          value={customValue}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            onCustomChange(v, mergeField(selected, v));
          }}
        />
      ) : null}
    </div>
  );
}
