"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const moods = ["溫柔", "祝福", "鼓勵", "希望", "思念", "安定"];
const occasions = ["生日", "畢業", "加油", "紀念日", "日常"];

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-[13px] font-semibold tracking-wide transition-colors",
        active
          ? "border-transparent bg-[color:var(--ink)] text-[color:var(--paper)]"
          : "border-[color:var(--line)] hover:bg-black/5 dark:hover:bg-white/10"
      )}
    >
      {children}
    </button>
  );
}

export function CardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");

  const selected = useMemo(
    () => ({
      mood: sp.get("mood") ?? "",
      occasion: sp.get("occasion") ?? "",
      status: sp.get("status") ?? "",
    }),
    [sp]
  );

  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(sp.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="grid gap-2">
          <span className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            搜尋
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              setParam("q", q.trim() || undefined);
            }}
            placeholder="輸入作品名稱或想法（例如：祝福、春天…）"
            className="h-11 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
          />
        </label>
        <div className="flex gap-2 sm:justify-end">
          <Chip onClick={() => setParam("q", q.trim() || undefined)}>套用</Chip>
          <Chip
            active={Boolean(sp.toString())}
            onClick={() => router.push(pathname)}
          >
            清除
          </Chip>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-2">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            情緒
          </p>
          <div className="flex flex-wrap gap-2">
            {moods.map((m) => (
              <Chip
                key={m}
                active={selected.mood === m}
                onClick={() => setParam("mood", selected.mood === m ? "" : m)}
              >
                {m}
              </Chip>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            場合
          </p>
          <div className="flex flex-wrap gap-2">
            {occasions.map((o) => (
              <Chip
                key={o}
                active={selected.occasion === o}
                onClick={() =>
                  setParam("occasion", selected.occasion === o ? "" : o)
                }
              >
                {o}
              </Chip>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            狀態
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "", label: "不限" },
              { id: "available", label: "可購買" },
              { id: "sold", label: "已售出" },
              { id: "custom_only", label: "可客製" },
            ].map((s) => (
              <Chip
                key={s.id || "any"}
                active={(selected.status || "") === s.id}
                onClick={() => setParam("status", s.id || "")}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

