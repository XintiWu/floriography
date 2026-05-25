import Link from "next/link";
import { ScrollyHero } from "@/components/home/scrolly-hero/ScrollyHero";
import { Container } from "@/components/Container";
import { getCards } from "@/lib/catalog";

export default async function Home() {
  const cards = await getCards();
  return (
    <main className="flex flex-1 flex-col">
      <ScrollyHero />

      <section className="py-24 sm:py-32">
        <Container>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[color:var(--muted)]">
                NEW & HIGHLIGHTS
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl tracking-[0.04em] sm:text-4xl">
                最新作品
              </h2>
            </div>
            <Link
              href="/floriography"
              className="text-sm font-semibold tracking-wide hover:underline"
            >
              查看全部 →
            </Link>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {cards.slice(0, 3).map((card) => (
              <Link
                key={card.id}
                href={`/cards/${card.id}`}
                className="group bg-[color:var(--card)] p-8 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
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
                <p className="mt-6 text-sm leading-relaxed text-[color:var(--muted)]">
                  {card.blurb}
                </p>
                <p className="mt-8 text-[11px] font-medium tracking-[0.2em] uppercase text-[color:var(--accent)]">
                  OPEN →
                </p>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-[color:var(--line)] py-24 sm:py-32">
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:items-start">
            <div className="md:col-span-5">
              <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[color:var(--muted)]">
                HOW IT WORKS
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl tracking-[0.04em] sm:text-4xl">
                面交/自取三步驟
              </h2>
              <p className="mt-6 text-sm leading-relaxed text-[color:var(--muted)]">
                先挑作品（或提出客製需求），再填表留下聯絡方式與想要的面交時段，我們會與你確認細節。
              </p>
            </div>
            <ol className="grid md:col-span-7">
              {[
                ["挑作品", "逛藝廊或用情境推薦，快速鎖定想說的心意。"],
                ["填需求", "留下 LINE/電話、預算、時間與地點偏好。"],
                ["確認面交", "我們與你確認成品與時間，完成交付。"],
              ].map(([title, desc], idx) => (
                <li
                  key={title}
                  className="border-t border-[color:var(--line)] py-8 first:border-t-0 first:pt-0"
                >
                  <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-[color:var(--muted)]">
                    STEP {idx + 1}
                  </p>
                  <p className="mt-3 text-base font-semibold tracking-wide">
                    {title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
                    {desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>
    </main>
  );
}
