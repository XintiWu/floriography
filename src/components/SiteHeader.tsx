"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Container } from "@/components/Container";
import { useState, useEffect } from "react";
import { authService } from "@/services/authService";
import { AuthOverlay } from "@/components/AuthOverlay";
import { User as UserIcon, LogOut, ChevronDown, LogIn, Layout } from "lucide-react";

const nav = [
  { href: "/cards", label: "作品" },
  { href: "/floriography", label: "花語資料庫" },
  { href: "/recommend", label: "情境推薦" },
  { href: "/studio", label: "創作工作坊" },
  { href: "/gallery", label: "花語牆" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    // 獲取初始用戶
    authService.getUser().then(setUser);

    // 監聽狀態變化
    const { data: { subscription } } = authService.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await authService.signOut();
    setIsUserMenuOpen(false);
  };

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-[color:var(--line)] bg-[color:var(--background)]/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-baseline gap-2">
          <span
            className={cn(
              "font-[family-name:var(--font-display)] text-2xl tracking-[0.12em] uppercase",
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
                  "px-3 py-2 text-[13px] font-medium tracking-wide transition-colors",
                  active
                    ? "text-black dark:text-white"
                    : "text-[color:var(--muted)] hover:bg-black/5 dark:hover:bg-white/10"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>


        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 border border-[color:var(--line)] px-3 py-1.5 transition-colors hover:bg-black/5"
              >
                <div className="flex h-6 w-6 items-center justify-center bg-[color:var(--line)]">
                  <UserIcon size={14} />
                </div>
                <span className="text-[13px] font-medium">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
                <ChevronDown size={14} className={cn("transition-transform", isUserMenuOpen && "rotate-180")} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 border border-[color:var(--line)] bg-[color:var(--background)] p-1.5">
                  <Link
                    href="/admin"
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[color:var(--muted)] hover:bg-black/5"
                  >
                    <Layout size={14} />
                    管理後台
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <LogOut size={14} />
                    登出
                  </button>
                </div>
              )}
            </div>
          ) : (
              <button
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-2 border border-[color:var(--line)] px-4 py-2 text-[13px] font-medium tracking-wide transition-colors hover:bg-black/5"
            >
              <LogIn size={14} />
              登入
            </button>
          )}

          <Link
            href="/reserve"
            className="bg-[color:var(--ink)] px-4 py-2 text-[13px] font-medium tracking-wide text-[color:var(--paper)] hover:bg-black/85"
          >
            預訂/詢價
          </Link>
        </div>
      </Container>
    </header>

    <AuthOverlay 
      isOpen={isAuthOpen} 
      onClose={() => setIsAuthOpen(false)} 
    />
  </>
  );
}

