import type { Metadata } from "next";
import { Container } from "@/components/Container";

export const metadata: Metadata = {
  title: "關於阿姨",
};

export default function AboutPage() {
  return (
    <main className="flex-1">
      <div className="border-b border-[color:var(--line)]">
        <Container className="py-10 sm:py-12">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            ABOUT
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[0.06em] sm:text-4xl">
            關於阿姨
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
            這裡放阿姨的手作故事、工作桌的一角、以及「為什麼要做壓花卡片」的那句話。
          </p>
        </Container>
      </div>

      <Container className="py-10 sm:py-12">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6">
            <p className="text-sm font-semibold tracking-wide">手工與時間</p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
              壓花需要等待與耐心：挑花、壓製、乾燥、保存、再用合適的紙材呈現。每張卡片都保留手作的細微差異。
            </p>
          </div>
          <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6">
            <p className="text-sm font-semibold tracking-wide">一張卡，一句話</p>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
              送禮最難的是「要說什麼」。我們把花語與情境整理起來，讓你挑卡時更快、更有把握。
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}

