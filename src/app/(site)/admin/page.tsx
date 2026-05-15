import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const metadata: Metadata = {
  title: "後台",
};

export default function AdminPage() {
  return (
    <main className="flex-1">
      <div className="border-b border-[color:var(--line)]">
        <Container className="py-10 sm:py-12">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            ADMIN
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[0.06em] sm:text-4xl">
            後台
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
            用 Supabase Auth 登入後可查看預訂/詢價、改狀態與備註。若尚未設定 Supabase，這頁會顯示設定提醒。
          </p>
        </Container>
      </div>

      <Container className="py-10 sm:py-12">
        <AdminPanel />
      </Container>
    </main>
  );
}

