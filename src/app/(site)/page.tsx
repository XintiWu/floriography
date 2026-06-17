import Link from "next/link";
import { ScrollyHero } from "@/components/home/scrolly-hero/ScrollyHero";
import { Container } from "@/components/Container";
import { getCards } from "@/lib/catalog";
import { ServiceOverview } from "../../components/home/ServiceOverview";
import { HomeHighlights } from "@/components/home/HomeHighlights";

export default async function Home() {
  const cards = await getCards();
  const highlightCards = (() => {
    const picked: typeof cards = [];
    const seen = new Set<string>();
    for (const c of cards) {
      const key = (c.title ?? "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      picked.push(c);
      if (picked.length >= 3) break;
    }
    if (picked.length >= 3) return picked;
    // fallback: 補滿 3 張（即使重複標題）
    for (const c of cards) {
      if (picked.length >= 3) break;
      if (!picked.some((x) => x.id === c.id)) picked.push(c);
    }
    return picked;
  })();
  return (
    <main className="flex flex-1 flex-col">
      <ScrollyHero />

      <section className="py-24 sm:py-32">
        <Container>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[color:var(--muted)]">
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

          <HomeHighlights cards={highlightCards} />
        </Container>
      </section>

      <ServiceOverview />

      <section className="py-24 sm:py-32">
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:items-start">
            <div className="md:col-span-5">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[color:var(--muted)]">
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
                  <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[color:var(--muted)]">
                    STEP {idx + 1}
                  </p>
                  <p className="mt-3 text-[16px] font-semibold tracking-wide">
                    {title}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--muted)]">
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
