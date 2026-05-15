import Image from "next/image";
import Link from "next/link";
import type { Card } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Reveal } from "@/components/motion/Reveal";

function StatusBadge({ status }: { status: Card["status"] }) {
  const label =
    status === "available" ? "可購買" : status === "sold" ? "已售出" : "可客製";
  return (
    <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--card)] px-3 py-1 text-[11px] font-semibold tracking-wide text-[color:var(--muted)]">
      {label}
    </span>
  );
}

export function CardGrid({ cards }: { cards: Card[] }) {
  if (cards.length === 0) {
    return (
      <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-8 text-sm leading-7 text-[color:var(--muted)]">
        沒有符合條件的作品。你可以清除篩選，或改用「情境推薦」讓系統先給你一個方向。
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, idx) => (
        <Reveal key={card.id} delay={Math.min(idx * 0.03, 0.18)}>
          <Link
            href={`/cards/${card.id}`}
            className={cn(
              "group overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)]",
              "transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={card.images[0] ?? "/demo/pressed-cards.png"}
                alt={card.title}
                fill
                sizes="(max-width: 1024px) 50vw, 33vw"
                className="object-contain transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            </div>
            <div className="grid gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-wide">
                    {card.title}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">
                    {card.status === "available"
                      ? `NT$ ${card.priceTwd}`
                      : card.status === "sold"
                        ? "已售出"
                        : "可客製委託"}
                  </p>
                </div>
                <StatusBadge status={card.status} />
              </div>

              <p className="text-sm leading-7 text-[color:var(--muted)]">
                {card.blurb ?? "點進去看看細節與預訂方式。"}
              </p>

              <div className="flex flex-wrap gap-2">
                {(card.tags.moods ?? []).slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-semibold tracking-wide dark:bg-white/10"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

