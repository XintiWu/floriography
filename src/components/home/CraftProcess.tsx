import { Leaf, Wind, Layers, Gem } from "lucide-react";
import { Container } from "@/components/Container";

const steps = [
  {
    icon: Leaf,
    step: "01",
    title: "新鮮花材採摘",
    desc: "只選用純新鮮花材，保留最飽滿的色澤與形態。",
  },
  {
    icon: Wind,
    step: "02",
    title: "乾燥紙壓製",
    desc: "以專業乾燥紙均勻吸附水分，緩慢加壓，讓花瓣完整定型。",
  },
  {
    icon: Layers,
    step: "03",
    title: "護貝膜組裝",
    desc: "完全乾燥後，逐片放入護貝膜，細心排列、固定，不留氣泡。",
  },
  {
    icon: Gem,
    step: "04",
    title: "護貝機壓縮成品",
    desc: "送入護貝機高溫壓縮，花材永久封存，完成一張可傳遞情意的作品。",
  },
];

export function CraftProcess() {
  return (
    <section className="border-t border-[color:var(--line)] py-24 sm:py-32">
      <Container>
        {/* 區塊標題 */}
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[color:var(--muted)]">
            CRAFT &amp; MATERIALS
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl tracking-[0.04em] sm:text-4xl">
            純手工壓花工藝
          </h2>
          <p className="mt-5 max-w-lg text-[15px] leading-8 text-[color:var(--muted)]">
            每一張卡片都從一株真實的鮮花開始。
            從採摘、壓製、到護貝封存，不省略任何一個步驟，
            讓花朵的模樣與情感一起被留住。
          </p>
        </div>

        {/* 四步驟 */}
        <div className="mt-14 grid gap-px border border-[color:var(--line)] bg-[color:var(--line)] sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, step, title, desc }) => (
            <div
              key={step}
              className="group relative flex flex-col gap-5 bg-[color:var(--background)] p-8 transition-colors hover:bg-[color:var(--card)]"
            >
              {/* 步驟編號（背景裝飾） */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-6 top-5 font-[family-name:var(--font-display)] text-6xl font-bold tracking-tight text-[color:var(--line)] select-none transition-colors group-hover:text-[color:var(--accent)]/15"
              >
                {step}
              </span>

              {/* 圖示 */}
              <div className="flex h-10 w-10 items-center justify-center border border-[color:var(--line)] bg-[color:var(--card)]">
                <Icon className="h-5 w-5 text-[color:var(--accent)]" />
              </div>

              <div>
                <p className="text-[13px] font-semibold tracking-[0.18em] uppercase text-[color:var(--muted)]">
                  STEP {step}
                </p>
                <p className="mt-2 text-[17px] font-semibold tracking-wide">
                  {title}
                </p>
                <p className="mt-3 text-[15px] leading-7 text-[color:var(--muted)]">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
