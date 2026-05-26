import Link from "next/link";
import {
  Camera,
  Flower2,
  Palette,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import type { ComponentType } from "react";

type Service = {
  key: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  feature: string;
  scenario: string;
  steps: string[];
};

const services: Service[] = [
  {
    key: "floriography",
    href: "/floriography",
    icon: Flower2,
    eyebrow: "花語資料庫",
    title: "花語選卡探索",
    feature: "以花名/花語/故事反向找到最契合的卡片。",
    scenario: "你想表達某種心意，但不確定從哪個花語開始。",
    steps: ["搜尋花種或花語", "查看解析與故事", "點選卡片預訂/詢價"],
  },
  {
    key: "recommend",
    href: "/recommend",
    icon: Sparkles,
    eyebrow: "情境推薦",
    title: "用情境找答案",
    feature: "輸入想要的場合/感受，系統推薦適合的作品組合。",
    scenario: "你知道自己要的氛圍，但想把條件交給系統快速配對。",
    steps: [
      "描述情境與想表達的感覺",
      "選擇偏好（場合/情緒/色系）",
      "查看推薦並進入預訂",
    ],
  },
  {
    key: "recognize",
    href: "/recognize",
    icon: Camera,
    eyebrow: "花朵辨識",
    title: "拍照辨識花種",
    feature: "上傳照片，回傳辨識結果與對應推薦。",
    scenario: "你手上有一張花的照片，想快速得到花語與建議卡片。",
    steps: ["上傳照片", "執行辨識", "獲得推薦並前往預訂"],
  },
  {
    key: "studio",
    href: "/studio",
    icon: Palette,
    eyebrow: "創作工作坊",
    title: "客製你的壓花作品",
    feature: "在工作坊完成圖層配置，形成一張你的專屬藍圖。",
    scenario: "你想做出不撞款的排版與風格，並掌握預算範圍。",
    steps: ["選素材與底紙", "編輯圖層與配置", "確認細節後下單/預訂"],
  },
];

export function ServiceOverview() {
  return (
    <section className="py-24 sm:py-32 border-t border-[color:var(--line)]">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[color:var(--muted)]">
              PLATFORM SERVICES
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl tracking-[0.04em] sm:text-4xl">
              四大功能，一次到位
            </h2>
          </div>
          <Link
            href="/floriography"
            className="text-sm font-semibold tracking-wide hover:underline"
          >
            先從花語選卡開始 →
          </Link>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {services.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className="group rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wide text-[color:var(--muted)] uppercase">
                      {s.eyebrow}
                    </p>
                    <h3 className="mt-3 text-lg font-semibold tracking-wide">
                      {s.title}
                    </h3>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)]/60">
                    <Icon className="h-5 w-5 text-[color:var(--accent)]" />
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[color:var(--muted)]">
                  <span className="font-semibold text-[color:var(--foreground)]">
                    功能/特色：
                  </span>{" "}
                  {s.feature}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
                  <span className="font-semibold text-[color:var(--foreground)]">
                    使用情境：
                  </span>{" "}
                  {s.scenario}
                </p>

                <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--background)]/40 p-4">
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[color:var(--muted)]">
                    流程
                  </p>
                  <ol className="mt-2 space-y-1">
                    {s.steps.map((step, idx) => (
                      <li
                        key={step}
                        className="flex items-start gap-2 text-xs text-[color:var(--muted)]"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 text-[color:var(--accent)]" />
                        <span>
                          <span className="font-semibold text-[color:var(--foreground)]">
                            {idx + 1}.
                          </span>{" "}
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                <Link
                  href={s.href}
                  className="mt-5 inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-[color:var(--accent)] hover:underline"
                >
                  去使用 <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

