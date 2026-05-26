import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { getCardById } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const card = await getCardById(id);
  return { title: card ? card.title : "作品" };
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = await getCardById(id);
  if (!card) notFound();

  return (
    <main className="flex-1">
      <div className="border-b border-[color:var(--line)]">
        <Container className="py-6 text-sm text-[color:var(--muted)]">
          <Link href="/floriography" className="hover:underline">
            花語資料庫
          </Link>{" "}
          / <span className="text-[color:var(--foreground)]">{card.title}</span>
        </Container>
      </div>

      <Container className="grid gap-8 py-10 sm:py-12 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)]">
            <div className="relative aspect-[4/3]">
              <Image
                src={card.images[0] ?? "/demo/pressed-cards.png"}
                alt={card.title}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
                priority
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6">
            <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
              花材與情緒標籤
            </p>
            <div className="flex flex-wrap gap-2">
              {[...card.tags.flowers, ...card.tags.moods, ...card.tags.occasions]
                .filter(Boolean)
                .slice(0, 8)
                .map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-semibold tracking-wide dark:bg-white/10"
                  >
                    {t}
                  </span>
                ))}
            </div>
          </div>
        </div>

        <aside className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6">
            <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
              CARD
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[0.06em]">
              {card.title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">
              {card.blurb ?? "點進去看看細節與預訂方式。"}
            </p>

            <div className="mt-6 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[color:var(--muted)]">狀態</span>
                <span className="font-semibold">
                  {card.status === "available"
                    ? "可購買"
                    : card.status === "sold"
                      ? "已售出"
                      : "可客製委託"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[color:var(--muted)]">參考價格</span>
                <span className="font-semibold">NT$ {card.priceTwd}</span>
              </div>
              {card.size ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[color:var(--muted)]">尺寸</span>
                  <span className="font-semibold">{card.size}</span>
                </div>
              ) : null}
              {typeof card.leadTimeDays === "number" ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[color:var(--muted)]">交期</span>
                  <span className="font-semibold">
                    {card.leadTimeDays === 0
                      ? "現貨"
                      : `約 ${card.leadTimeDays} 天`}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-7 grid gap-3">
              <Button href={`/reserve?cardId=${encodeURIComponent(card.id)}`} size="lg">
                預訂/詢價這張
              </Button>
              <Button href="/recommend" size="lg" variant="outline">
                我想看更多相似推薦
              </Button>
            </div>

            <p className="mt-6 text-xs leading-6 text-[color:var(--muted)]">
              提醒：手工壓花每張都會略有差異。若此款已售出，可在預訂表單中註明「想要相近風格」。
            </p>
          </div>
        </aside>
      </Container>
    </main>
  );
}

