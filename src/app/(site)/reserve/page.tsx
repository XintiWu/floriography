import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { ReserveForm } from "@/components/reserve/ReserveForm";
import { getCardById } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "預訂 / 詢價",
};

export default async function ReservePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const cardId = typeof sp.cardId === "string" ? sp.cardId : "";
  const card = cardId ? await getCardById(cardId) : undefined;

  return (
    <main className="flex-1">
      <div className="border-b border-[color:var(--line)]">
        <Container className="py-10 sm:py-12">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            RESERVE / INQUIRY
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[0.06em] sm:text-4xl">
            預訂 / 詢價
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
            目前以台灣面交/自取為主。你填完資料後，我們會用你留下的聯絡方式確認時間、地點與成品細節。
          </p>
          {card ? (
            <p className="mt-5 text-sm">
              你正在詢問作品：
              <Link
                className="ml-2 font-semibold hover:underline"
                href="/floriography"
              >
                {card.title}
              </Link>
            </p>
          ) : cardId === "workshop-custom" ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[color:var(--accent)]/10 px-3 py-2 text-xs font-semibold text-[color:var(--accent)] border border-[color:var(--accent)]/20 animate-fade-in">
              <span>🎨</span>
              <span>已成功載入您的「工作坊自訂設計藍圖」，請確認下方客製明細並送出委託。</span>
            </div>
          ) : (
            <p className="mt-5 text-sm text-[color:var(--muted)]">
              還沒決定要哪一張？可以先{" "}
              <Link className="underline" href="/floriography">
                逛花語
              </Link>{" "}
              或{" "}
              <Link className="underline" href="/recommend">
                讓我推薦
              </Link>
              。
            </p>
          )}
        </Container>
      </div>

      <Container className="py-10 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-7">
            <ReserveForm defaultCardId={cardId} />
          </div>
          <aside className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6">
              <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
                提醒
              </p>
              <ul className="mt-4 grid gap-3 text-sm leading-7 text-[color:var(--muted)]">
                <li>面交地點：請填你方便的捷運站/地標（可協調）。</li>
                <li>時間：建議填 2–3 個時段，確認會更快。</li>
                <li>客製：可在備註填「用途、顏色、想表達的話」。</li>
              </ul>
              <p className="mt-5 text-xs leading-6 text-[color:var(--muted)]">
                我們會在確認後才安排製作與交付，不需先付款。
              </p>
            </div>
          </aside>
        </div>
      </Container>
    </main>
  );
}

