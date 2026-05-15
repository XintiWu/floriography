import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { CardGrid } from "@/components/cards/CardGrid";
import { CardFilters } from "@/components/cards/CardFilters";
import { getCards } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "作品",
};

export default async function CardsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const mood = typeof sp.mood === "string" ? sp.mood : "";
  const occasion = typeof sp.occasion === "string" ? sp.occasion : "";
  const status = typeof sp.status === "string" ? sp.status : "";

  const all = await getCards();
  const cards = all.filter((c) => {
    if (q) {
      const hay = `${c.title} ${c.blurb ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    if (mood && !c.tags.moods.includes(mood)) return false;
    if (occasion && !c.tags.occasions.includes(occasion)) return false;
    if (status && c.status !== status) return false;
    return true;
  });

  return (
    <main className="flex-1">
      <div className="border-b border-[color:var(--line)]">
        <Container className="py-10 sm:py-12">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            GALLERY
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[0.06em] sm:text-4xl">
            作品藝廊
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
            每張卡片都是手工壓花。你可以先用「情緒」或「場合」縮小範圍，再點進去看細節與預訂方式。
          </p>
          <div className="mt-7">
            <CardFilters />
          </div>
        </Container>
      </div>

      <Container className="py-10 sm:py-12">
        <CardGrid cards={cards} />
      </Container>
    </main>
  );
}

