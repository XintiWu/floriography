import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { getFlowers } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "花語資料庫",
};

export default async function FloriographyPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const all = await getFlowers();
  const flowers = all.filter((f) => {
    if (!q) return true;
    const hay = `${f.name} ${(f.meanings ?? []).join(" ")} ${f.story ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  return (
    <main className="flex-1">
      <div className="relative overflow-hidden border-b border-[color:var(--line)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[color:var(--accent)]/14 blur-3xl" />
          <div className="absolute -right-28 -top-20 h-72 w-72 rounded-full bg-[color:var(--accent-2)]/12 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[color:var(--background)]" />
        </div>

        <Container className="py-12 sm:py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--card)]/70 px-3 py-1 text-[11px] font-semibold tracking-[0.26em] text-[color:var(--muted)] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
            FLORIOGRAPHY
          </div>

          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[0.08em] sm:text-5xl">
            花語資料庫
          </h1>

          <div className="mt-3 flex items-center gap-3">
            <div className="h-px w-14 bg-[color:var(--accent)]/70" />
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              搜尋花名、花語與故事，快速找到適合的寓意。
            </p>
          </div>
        </Container>
      </div>

      <Container className="py-10 sm:py-12">
        <form className="mb-6 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-2">
            <span className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
              搜尋花語 / 寓意
            </span>
            <input
              name="q"
              defaultValue={q}
              placeholder="例：祝福、希望、百合…"
              className="h-11 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
            />
          </label>
          <div className="flex gap-2 sm:justify-end">
            <button
              type="submit"
              className="h-11 rounded-full bg-[color:var(--ink)] px-5 text-sm font-semibold tracking-wide text-[color:var(--paper)] hover:bg-black/85"
            >
              搜尋
            </button>
            <Link
              href="/floriography"
              className="h-11 rounded-full border border-[color:var(--line)] px-5 text-sm font-semibold tracking-wide hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
            >
              清除
            </Link>
          </div>
        </form>

        {q ? (
          <p className="mb-6 text-sm text-[color:var(--muted)]">
            搜尋「<span className="font-semibold text-[color:var(--foreground)]">{q}</span>」：
            找到 {flowers.length} 筆
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flowers.map((f) => (
            <Link
              key={f.id}
              href={`/floriography/${f.id}`}
              className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
              <p className="text-sm font-semibold tracking-wide">{f.name}</p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
                {f.meanings.join("、")}
              </p>
              <p className="mt-5 text-xs font-semibold tracking-[0.22em] text-[color:var(--accent)]">
                READ →
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </main>
  );
}

