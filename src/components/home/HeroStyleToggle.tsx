"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const styles = [
  { id: "artisan", label: "手作紙感" },
  { id: "editorial", label: "雜誌精品" },
  { id: "gallery", label: "數位藝廊" },
  { id: "scrollstory", label: "捲動沈浸" },
] as const;

export type HeroStyleId = (typeof styles)[number]["id"];

export function HeroStyleToggle() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = (sp.get("style") || "artisan") as HeroStyleId;

  const setStyle = (id: HeroStyleId) => {
    const next = new URLSearchParams(sp.toString());
    next.set("style", id);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--background)]/70 p-1 backdrop-blur">
      {styles.map((s) => {
        const active = current === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => setStyle(s.id)}
            className={cn(
              "h-9 rounded-full px-4 text-[12px] font-semibold tracking-wide transition-colors",
              active
                ? "bg-[color:var(--ink)] text-[color:var(--paper)]"
                : "text-[color:var(--muted)] hover:bg-black/5 dark:hover:bg-white/10"
            )}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

