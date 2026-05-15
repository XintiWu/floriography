import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { query } from "@/lib/db";

const schema = z.object({
  cardId: z.string().optional(),
  customerName: z.string().min(1),
  contact: z.string().min(1),
  preferredPickup: z.string().min(1),
  timeWindow: z.string().min(1),
  budgetTwd: z.number().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  customRequest: z.string().optional(),
});

function makeId() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `FR-${ts}-${rand}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const id = makeId();
  const createdAt = new Date().toISOString();

  // 1. 嘗試獲取登入用戶資訊
  const supabase = createSupabaseServerClient();
  let userId = null;
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  }

  // 2. 寫入 OCI PostgreSQL (正式資料庫)
  try {
    const fullNotes = [
      parsed.data.purpose ? `用途: ${parsed.data.purpose}` : null,
      parsed.data.notes ? `備註: ${parsed.data.notes}` : null,
      parsed.data.customRequest ? `客製需求: ${parsed.data.customRequest}` : null,
      parsed.data.cardId ? `作品 ID: ${parsed.data.cardId}` : null
    ].filter(Boolean).join("\n");

    const shippingAddress = `${parsed.data.preferredPickup} (${parsed.data.timeWindow})`;

    await query(`
      INSERT INTO orders (id, customer_name, customer_phone, shipping_address, notes, total_price, status, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      id,
      parsed.data.customerName,
      parsed.data.contact,
      shippingAddress,
      fullNotes,
      parsed.data.budgetTwd || 0,
      'pending',
      userId
    ]);
  } catch (err: any) {
    console.error("OCI Order Insert Failed:", err);
    // 即使 OCI 失敗，我們還是繼續嘗試寫入 Supabase 作為備援
  }

  // 3. 寫入 Supabase (備援/過渡)
  if (supabase) {
    const { error } = await supabase.from("order_requests").insert({
      id,
      created_at: createdAt,
      status: "new",
      card_id: parsed.data.cardId || null,
      customer_name: parsed.data.customerName,
      contact: parsed.data.contact,
      preferred_pickup: parsed.data.preferredPickup,
      time_window: parsed.data.timeWindow,
      budget_twd: parsed.data.budgetTwd ?? null,
      purpose: parsed.data.purpose ?? null,
      notes: parsed.data.notes ?? null,
      custom_request: parsed.data.customRequest ?? null,
    });
    // 如果 Supabase 也失敗且 OCI 已經失敗，才報錯
  }

  // Optional: email notification (Resend). If not configured, silently skip.
  const resendKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.ADMIN_NOTIFY_EMAIL;
  const from = process.env.RESEND_FROM ?? "Floriography <onboarding@resend.dev>";
  if (resendKey && notifyTo) {
    const lines = [
      `編號：${id}`,
      `姓名：${parsed.data.customerName}`,
      `聯絡：${parsed.data.contact}`,
      `面交：${parsed.data.preferredPickup}（${parsed.data.timeWindow}）`,
      parsed.data.cardId ? `cardId：${parsed.data.cardId}` : null,
      typeof parsed.data.budgetTwd === "number"
        ? `預算：${parsed.data.budgetTwd}`
        : null,
      parsed.data.purpose ? `用途：${parsed.data.purpose}` : null,
      parsed.data.notes ? `備註：${parsed.data.notes}` : null,
      parsed.data.customRequest ? `客製：${parsed.data.customRequest}` : null,
      `建立時間：${createdAt}`,
    ].filter(Boolean);

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [notifyTo],
        subject: `【Floriography】新的預訂/詢價 ${id}`,
        text: lines.join("\n"),
      }),
    }).catch(() => null);
  }

  return NextResponse.json({ id });
}

