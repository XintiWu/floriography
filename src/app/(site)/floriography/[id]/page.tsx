import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { getFlowerById, getCards } from "@/lib/catalog";
import { resolveFlowerMeanings } from "@/lib/flowerMeanings";
import { resolveFlowerStory } from "@/lib/flowerStory";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const flower = await getFlowerById(id);
  return { title: flower ? flower.name : "花語" };
}

export default async function FlowerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const flower = await getFlowerById(id);
  if (!flower) notFound();

  const dbMeanings = flower.meanings && flower.meanings.length > 0 ? flower.meanings : [];
  const meanings = dbMeanings.length > 0 ? dbMeanings : resolveFlowerMeanings(flower.name);
  const story = flower.story || resolveFlowerStory(flower.name);

  const allCards = await getCards();
  const related = allCards.filter((c) =>
    c.tags.flowers.some(
      (x) => x.includes(flower.name) || flower.name.includes(x)
    )
  );

  return (
    <main className="flex-1">
      <div className="border-b border-[color:var(--line)]">
        <Container className="py-6 text-sm text-[color:var(--muted)]">
          <Link href="/floriography" className="hover:underline">
            花語資料庫
          </Link>{" "}
          / <span className="text-[color:var(--foreground)]">{flower.name}</span>
        </Container>
      </div>

      <Container className="grid gap-6 py-10 sm:py-12 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7">
            <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
              MEANING
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[0.06em]">
              {flower.name}
            </h1>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">
              花語：{meanings.join("、")}
            </p>
            {story ? (
              <p className="mt-4 text-sm leading-7 text-[color:var(--muted)] whitespace-pre-line">
                {story}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7">
            <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
              RELATED
            </p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
              含此花材的標本卡作品。
            </p>
            <div className="mt-4 grid gap-2">
              {(related.length ? related : allCards.slice(0, 3)).map((c) => (
                <Link
                  key={c.id}
                  href={`/reserve?cardId=${encodeURIComponent(c.id)}`}
                  className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm font-semibold tracking-wide hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {c.title}
                </Link>
              ))}
            </div>
            <div className="mt-4 text-xs text-[color:var(--muted)]">
              想用情境直接挑？去{" "}
              <Link className="underline" href="/recommend">
                情境推薦
              </Link>
              。
            </div>
          </div>
        </aside>
      </Container>
    </main>
  );
}

