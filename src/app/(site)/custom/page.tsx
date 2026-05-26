import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";

export const metadata: Metadata = {
  title: "客製委託",
};

export default function CustomPage() {
  return (
    <main className="flex-1">
      <div className="border-b border-[color:var(--line)]">
        <Container className="py-10 sm:py-12">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            CUSTOM
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[0.06em] sm:text-4xl">
            客製委託
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
            想把一段話、一次祝福或一個人放進卡片裡？你可以描述用途、預算、喜歡的色系或花材，我們會與你確認可行性與交期。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button href="/reserve" size="lg">
              送出委託
            </Button>
            <Button href="/floriography" size="lg" variant="outline">
              先看現有作品
            </Button>
          </div>
        </Container>
      </div>

      <Container className="py-10 sm:py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [
              "你提供",
              "用途、想表達的情緒、預算、色系偏好、希望面交地點與時段。",
            ],
            ["我們確認", "可做範圍、交期、參考樣式，並提供建議與搭配。"],
            ["完成交付", "確認時間地點後面交/自取；若有更改需求可在確認前調整。"],
          ].map(([t, d]) => (
            <div
              key={t}
              className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6"
            >
              <p className="text-sm font-semibold tracking-wide">{t}</p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
                {d}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-[color:var(--muted)]">
          也可以先到{" "}
          <Link className="underline" href="/floriography">
            花語資料庫
          </Link>{" "}
          看看你想要的寓意，或用{" "}
          <Link className="underline" href="/recommend">
            情境推薦
          </Link>{" "}
          先找到方向。
        </p>
      </Container>
    </main>
  );
}

