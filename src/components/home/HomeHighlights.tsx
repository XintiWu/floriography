"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Card } from "@/lib/types";
import { getCardStoryText } from "@/lib/cardText";

export function HomeHighlights({ cards }: { cards: Card[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const expanded = expandedId === card.id;
        return (
          <div
            key={card.id}
            className="group overflow-hidden bg-[color:var(--card)] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={card.images[0] ?? "/demo/pressed-cards.png"}
                alt={card.title}
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-contain transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            </div>

            <div className="p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold tracking-wide">
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
                <span className="border border-[color:var(--line)] px-3 py-1.5 text-[10px] tracking-widest uppercase text-[color:var(--muted)]">
                  {card.tags.moods[0] ?? "心意"}
                </span>
              </div>

              <AnimatePresence initial={false}>
                {expanded ? (
                  <motion.div
                    key="detail"
                    initial={{ height: 0, opacity: 0, y: 6 }}
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: 6 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-6 overflow-hidden"
                  >
                    <p className="text-sm leading-relaxed text-[color:var(--muted)] whitespace-pre-line">
                      {getCardStoryText(card)}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedId((s) => (s === card.id ? null : card.id))}
                  className={`h-10 border text-xs font-semibold tracking-wide transition-all flex items-center justify-center ${
                    expanded
                      ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
                      : "border-[color:var(--line)] bg-transparent text-[color:var(--muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[color:var(--foreground)]"
                  }`}
                >
                  {expanded ? "收起詳情" : "作品詳情"}
                </button>

                <Link
                  href={`/reserve?cardId=${encodeURIComponent(card.id)}`}
                  className="h-10 text-xs font-semibold tracking-wide flex items-center justify-center transition-all bg-[color:var(--ink)] text-[color:var(--paper)] hover:bg-black/85"
                >
                  預訂 →
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

