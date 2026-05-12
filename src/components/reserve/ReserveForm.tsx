"use client";

import { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";

const schema = z.object({
  cardId: z.string().optional(),
  customerName: z.string().min(1, "請填姓名"),
  contact: z.string().min(3, "請填電話或 LINE ID"),
  preferredPickup: z.string().min(2, "請填面交地點"),
  timeWindow: z.string().min(2, "請填時間區段"),
  budgetTwd: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
      message: "預算需為數字",
    }),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  customRequest: z.string().optional(),
});

type FormState = z.input<typeof schema>;

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold tracking-wide">{label}</span>
      {children}
      {error ? (
        <span className="text-xs font-semibold text-[color:var(--accent)]">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-[color:var(--muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

export function ReserveForm({ defaultCardId }: { defaultCardId?: string }) {
  const [form, setForm] = useState<FormState>({
    cardId: defaultCardId || "",
    customerName: "",
    contact: "",
    preferredPickup: "",
    timeWindow: "",
    budgetTwd: "",
    purpose: "",
    notes: "",
    customRequest: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (defaultCardId === "workshop-custom") {
      try {
        const saved = localStorage.getItem("floriography_workshop_blueprint");
        if (saved) {
          const blueprint = JSON.parse(saved);
          setForm((s) => ({
            ...s,
            budgetTwd: String(blueprint.totalPrice || ""),
            purpose: "自訂卡片委託",
            customRequest: `【工作坊客製化藍圖明細】\n底紙選用：${blueprint.baseName || "經典卡"}\n圖層配置清單：\n${
              blueprint.layers?.map((l: any, idx: number) => `[圖層 ${idx + 1}] ${l.symbol || "❀"} ${l.name} (單價: NT$${l.price})`).join("\n") || "無"
            }\n總試算定價：NT$${blueprint.totalPrice}\n\n期望依據此藍圖客製實體作品。`,
          }));
        }
      } catch (e) {
        console.error("Failed to parse saved blueprint", e);
      }
    }
  }, [defaultCardId]);

  const canSubmit = useMemo(() => {
    const parsed = schema.safeParse(form);
    return parsed.success;
  }, [form]);

  const submit = async () => {
    setSubmitting(true);
    setErrors({});
    setResult(null);

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        next[key] = issue.message;
      }
      setErrors(next);
      setSubmitting(false);
      return;
    }

    const payload = parsed.data;
    const res = await fetch("/api/order-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setErrors({ form: "送出失敗，請稍後再試或改用聯絡頁。"} );
      setSubmitting(false);
      return;
    }

    const json = (await res.json()) as { id: string };
    setResult(json);
    setSubmitting(false);
  };

  if (result) {
    return (
      <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7">
        <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
          RECEIVED
        </p>
        <p className="mt-3 text-lg font-semibold tracking-wide">
          已收到你的需求
        </p>
        <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
          你的編號是{" "}
          <span className="font-semibold text-[color:var(--foreground)]">
            {result.id}
          </span>
          。我們會用你留下的聯絡方式與你確認面交時間與成品細節。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/cards" variant="outline">
            繼續逛作品
          </Button>
          <Button href="/contact" variant="ghost">
            改用聯絡方式
          </Button>
        </div>
      </div>
    );
  }

  const inputClass =
    "h-11 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]";
  const textareaClass = cn(inputClass, "h-28 py-3");

  return (
    <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            FORM
          </p>
          <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
            填寫越完整，我們確認會越快。
          </p>
        </div>
        {form.cardId ? (
          <span className="rounded-full border border-[color:var(--line)] px-3 py-2 text-[12px] font-semibold text-[color:var(--muted)]">
            cardId: {form.cardId}
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-5">
        {errors.form ? (
          <p className="text-sm font-semibold text-[color:var(--accent)]">
            {errors.form}
          </p>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="姓名" error={errors.customerName}>
            <input
              className={inputClass}
              value={form.customerName}
              onChange={(e) =>
                setForm((s) => ({ ...s, customerName: e.target.value }))
              }
              placeholder="例：王小美"
            />
          </Field>

          <Field label="聯絡方式" hint="電話或 LINE ID" error={errors.contact}>
            <input
              className={inputClass}
              value={form.contact}
              onChange={(e) =>
                setForm((s) => ({ ...s, contact: e.target.value }))
              }
              placeholder="例：09xx-xxx-xxx / line: abc123"
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="面交地點" error={errors.preferredPickup}>
            <input
              className={inputClass}
              value={form.preferredPickup}
              onChange={(e) =>
                setForm((s) => ({ ...s, preferredPickup: e.target.value }))
              }
              placeholder="例：台北車站 / 古亭站 / 某地標"
            />
          </Field>

          <Field label="希望時間區段" error={errors.timeWindow}>
            <input
              className={inputClass}
              value={form.timeWindow}
              onChange={(e) =>
                setForm((s) => ({ ...s, timeWindow: e.target.value }))
              }
              placeholder="例：週六 14:00–17:00 / 週一晚上"
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="預算（選填）" error={errors.budgetTwd}>
            <input
              className={inputClass}
              inputMode="numeric"
              value={String(form.budgetTwd ?? "")}
              onChange={(e) =>
                setForm((s) => ({ ...s, budgetTwd: e.target.value }))
              }
              placeholder="例：200"
            />
          </Field>
          <Field label="用途（選填）">
            <input
              className={inputClass}
              value={form.purpose ?? ""}
              onChange={(e) =>
                setForm((s) => ({ ...s, purpose: e.target.value }))
              }
              placeholder="例：畢業、生日、道謝…"
            />
          </Field>
        </div>

        <Field label="想說的話 / 備註（選填）">
          <textarea
            className={textareaClass}
            value={form.notes ?? ""}
            onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            placeholder="例：想要溫柔的粉色系、希望表達鼓勵…"
          />
        </Field>

        <Field label="客製需求（選填）" hint="若你想客製，可描述想要的色系/花材/風格">
          <textarea
            className={textareaClass}
            value={form.customRequest ?? ""}
            onChange={(e) =>
              setForm((s) => ({ ...s, customRequest: e.target.value }))
            }
            placeholder="例：想做給媽媽，偏奶油白＋淡粉，字句不超過 20 字…"
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="lg"
            onClick={submit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? "送出中…" : "送出"}
          </Button>
          <p className="text-xs text-[color:var(--muted)]">
            送出即代表同意我們以你留下的聯絡方式與你確認面交。
          </p>
        </div>
      </div>
    </div>
  );
}

