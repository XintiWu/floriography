"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Container } from "@/components/Container";

const nav = [
  { href: "/cards", label: "作品" },
  { href: "/floriography", label: "花語資料庫" },
  { href: "/recommend", label: "情境推薦" },
  { href: "/studio", label: "創作工作坊" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--line)] bg-[color:var(--background)]/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-baseline gap-2">
          <span
            className={cn(
              "font-[family-name:var(--font-display)] text-xl tracking-[0.12em] uppercase",
              "group-hover:opacity-90"
            )}
          >
            Floriography
          </span>
          <span className="text-xs text-[color:var(--muted)] tracking-wide">
            壓花卡片
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3 py-2 text-[13px] font-semibold tracking-wide transition-colors",
                  active
                    ? "bg-black/5 dark:bg-white/10"
                    : "hover:bg-black/5 dark:hover:bg-white/10"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/reserve"
          className="rounded-full bg-[color:var(--ink)] px-4 py-2 text-[13px] font-semibold tracking-wide text-[color:var(--paper)] hover:bg-black/85"
        >
          預訂/詢價
        </Link>
      </Container>
    </header>
  );
}

