"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Row = {
  id: string;
  created_at: string;
  status: string;
  card_id: string | null;
  customer_name: string;
  contact: string;
  preferred_pickup: string;
  time_window: string;
  budget_twd: number | null;
  purpose: string | null;
  notes: string | null;
  custom_request: string | null;
};

const signInSchema = z.object({
  email: z.string().email("Email 格式不正確"),
  password: z.string().min(6, "密碼至少 6 碼"),
});

export function AdminPanel() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("order_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) setError(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [supabase]);

  const updateRow = useCallback(
    async (id: string, patch: Partial<Pick<Row, "status" | "notes">>) => {
      if (!supabase) return;
      setSavingId(id);
      setError(null);
      const { error } = await supabase
        .from("order_requests")
        .update({
          status: patch.status,
          notes: patch.notes,
        })
        .eq("id", id);
      if (error) setError(error.message);
      await refresh();
      setSavingId(null);
    },
    [refresh, supabase]
  );

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const next = data.session?.user.email ?? null;
      setSessionEmail(next);
      if (next) void refresh();
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.email ?? null;
      setSessionEmail(next);
      if (next) void refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [refresh, supabase]);

  if (!supabase) {
    return (
      <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7 text-sm leading-7 text-[color:var(--muted)]">
        尚未設定 Supabase。請在 `.env.local` 設定
        `NEXT_PUBLIC_SUPABASE_URL` 與 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，並在
        Supabase 建立 `order_requests` 資料表與 RLS policy。
      </div>
    );
  }

  if (!sessionEmail) {
    const parsed = signInSchema.safeParse({ email, password });
    return (
      <div className="grid gap-4 rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7">
        <p className="text-sm font-semibold tracking-wide">登入</p>
        {error ? (
          <p className="text-sm font-semibold text-[color:var(--accent)]">
            {error}
          </p>
        ) : null}
        <input
          className="h-11 rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          type="password"
          className="h-11 rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <Button
          type="button"
          variant="primary"
          disabled={!parsed.success}
          onClick={async () => {
            setError(null);
            const p = signInSchema.safeParse({ email, password });
            if (!p.success) {
              setError(p.error.issues[0]?.message ?? "請檢查輸入");
              return;
            }
            const { error } = await supabase.auth.signInWithPassword({
              email: p.data.email,
              password: p.data.password,
            });
            if (error) setError(error.message);
          }}
        >
          登入
        </Button>
        <p className="text-xs leading-6 text-[color:var(--muted)]">
          第一次使用請先在 Supabase 建立管理者帳號（Email/Password）。
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[color:var(--muted)]">
          已登入：<span className="font-semibold">{sessionEmail}</span>
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={refresh}>
            {loading ? "讀取中…" : "重新整理"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              await supabase.auth.signOut();
            }}
          >
            登出
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm font-semibold text-[color:var(--accent)]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3">
        {rows.length ? (
          rows.map((r) => (
            <div
              key={r.id}
              className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <p className="text-sm font-semibold tracking-wide">{r.id}</p>
                  <p className="text-xs text-[color:var(--muted)]">
                    {new Date(r.created_at).toLocaleString("zh-TW")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="h-9 rounded-full border border-[color:var(--line)] bg-[color:var(--card)] px-3 text-[12px] font-semibold tracking-wide text-[color:var(--muted)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                    value={r.status}
                    onChange={(e) => updateRow(r.id, { status: e.target.value })}
                    disabled={savingId === r.id}
                  >
                    {["new", "contacted", "scheduled", "completed", "cancelled"].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      )
                    )}
                  </select>
                  {savingId === r.id ? (
                    <span className="text-xs text-[color:var(--muted)]">
                      儲存中…
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-[color:var(--muted)]">
                <p>
                  <span className="font-semibold text-[color:var(--foreground)]">
                    {r.customer_name}
                  </span>{" "}
                  ・ {r.contact}
                </p>
                <p>
                  面交：{r.preferred_pickup}（{r.time_window}）
                </p>
                {r.card_id ? <p>cardId：{r.card_id}</p> : null}
                {r.budget_twd ? <p>預算：{r.budget_twd}</p> : null}
                {r.purpose ? <p>用途：{r.purpose}</p> : null}
                <label className="grid gap-2 pt-2">
                  <span className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
                    備註（後台用）
                  </span>
                  <textarea
                    className="min-h-20 rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] px-4 py-3 text-sm leading-7 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                    defaultValue={r.notes ?? ""}
                    placeholder="例：已加 LINE、約週六 15:00、改成粉色系…"
                    onBlur={(e) => updateRow(r.id, { notes: e.target.value })}
                    disabled={savingId === r.id}
                  />
                  <span className="text-xs text-[color:var(--muted)]">
                    輸入後點一下其他地方會自動儲存（onBlur）。
                  </span>
                </label>
                {r.custom_request ? <p>客製：{r.custom_request}</p> : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-7 text-sm leading-7 text-[color:var(--muted)]">
            目前沒有資料（或 RLS 阻擋讀取）。你可以先去前台送出一筆預訂/詢價測試。
          </div>
        )}
      </div>
    </div>
  );
}

