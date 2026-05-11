import type { Metadata } from "next";
import { Container } from "@/components/Container";

export const metadata: Metadata = {
  title: "FAQ",
};

const faqs = [
  {
    q: "目前怎麼取貨？",
    a: "以台灣面交/自取為主。你填完表單後，我們會用你留下的聯絡方式確認時間與地點。",
  },
  {
    q: "可以客製嗎？",
    a: "可以。你可以在預訂/詢價表單描述用途、預算與想要的色系/花材，我們會回覆可行性與交期。",
  },
  {
    q: "壓花卡片怎麼保存？",
    a: "避免潮濕與直曬；若想長期保存，可加透明護膜或放入乾燥收納。",
  },
  {
    q: "如果想改期或取消？",
    a: "面交前都可以協調改期；若已進入製作流程，可能會依材料與工時酌收成本，細節可在確認時說明。",
  },
];

export default function FaqPage() {
  return (
    <main className="flex-1">
      <div className="border-b border-[color:var(--line)]">
        <Container className="py-10 sm:py-12">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            FAQ
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[0.06em] sm:text-4xl">
            常見問題
          </h1>
        </Container>
      </div>

      <Container className="py-10 sm:py-12">
        <div className="grid gap-3">
          {faqs.map((item) => (
            <div
              key={item.q}
              className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6"
            >
              <p className="text-sm font-semibold tracking-wide">{item.q}</p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </main>
  );
}

