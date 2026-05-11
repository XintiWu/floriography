import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";

export const metadata: Metadata = {
  title: "聯絡與面交",
};

export default function ContactPage() {
  return (
    <main className="flex-1">
      <div className="border-b border-[color:var(--line)]">
        <Container className="py-10 sm:py-12">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            CONTACT
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[0.06em] sm:text-4xl">
            聯絡與面交
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
            建議先用{" "}
            <Link className="underline" href="/reserve">
              預訂/詢價表單
            </Link>{" "}
            留下需求。
          </p>
        </Container>
      </div>

      <Container className="py-10 sm:py-12">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6">
            <p className="text-sm font-semibold tracking-wide">LINE</p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
              這裡放 LINE 官方帳號連結或 QR code（之後可替換）。
            </p>
          </div>
          <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6">
            <p className="text-sm font-semibold tracking-wide">面交地點</p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
              這裡放常用面交點（例如：某捷運站）。也可以加上 Google Map 連結。
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}

