import Link from "next/link";
import { Container } from "@/components/Container";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[color:var(--line)]">
      <Container className="grid gap-6 py-20 sm:grid-cols-2 sm:items-start">
        <div className="grid gap-2">
          <p className="font-[family-name:var(--font-display)] text-xl tracking-[0.12em] uppercase">
            Floriography
          </p>
          <p className="text-sm text-[color:var(--muted)] leading-7">
            把壓花卡片的情緒與故事數位化，讓你更快挑到想送的那一張。
          </p>
        </div>
        <div className="grid gap-2 sm:justify-self-end sm:text-right">
          <Link className="text-sm hover:underline" href="/contact">
            聯絡與面交資訊
          </Link>
          <Link className="text-sm hover:underline" href="/about">
            關於阿姨
          </Link>
          <p className="text-xs text-[color:var(--muted)]">
            © {new Date().getFullYear()} Floriography
          </p>
        </div>
      </Container>
    </footer>
  );
}

