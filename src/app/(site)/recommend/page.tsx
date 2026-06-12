import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { RecommendFormWrapper } from "@/components/recommend/RecommendFormWrapper";

export const metadata: Metadata = {
  title: "情境推薦",
};

export default function RecommendPage() {
  return (
    <main className="flex-1">
      <div className="relative overflow-hidden border-b border-[color:var(--line)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[color:var(--accent-2)]/14 blur-3xl" />
          <div className="absolute -right-28 -top-20 h-72 w-72 rounded-full bg-[color:var(--accent)]/12 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[color:var(--background)]" />
        </div>

        <Container className="py-12 sm:py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--card)]/70 px-3 py-1 text-[11px] font-semibold tracking-[0.26em] text-[color:var(--muted)] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent-2)]" />
            RECOMMEND
          </div>

          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] sm:text-5xl">
            情境推薦
          </h1>

          <div className="mt-3 flex items-center gap-3">
            <div className="h-px w-14 bg-[color:var(--accent-2)]/70" />
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              左側輸入情境由 AI（Gemini，本機 Ollama 備援）解析並推薦；右欄可微調對象、場合、花語等後「重新生成」。
            </p>
          </div>
        </Container>
      </div>

      <Container className="py-10 sm:py-12">
        <RecommendFormWrapper />
      </Container>
    </main>
  );
}
