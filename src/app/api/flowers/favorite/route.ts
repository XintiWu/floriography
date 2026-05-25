import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    let userId = null;
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      return NextResponse.json({ favorites: [] });
    }

    const result = await query(
      `SELECT flower_id FROM user_favorite_flowers WHERE user_id = $1`,
      [userId]
    );

    return NextResponse.json({ favorites: result.rows.map((row: any) => row.flower_id) });
  } catch (error) {
    console.error("Failed to get favorite flowers:", error);
    return NextResponse.json({ error: "Failed to get favorite flowers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    let userId = null;
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { flowerId } = await req.json();
    if (!flowerId) {
      return NextResponse.json({ error: "flowerId is required" }, { status: 400 });
    }

    await query(
      `INSERT INTO user_favorite_flowers (user_id, flower_id) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id, flower_id) DO NOTHING`,
      [userId, flowerId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save favorite flower:", error);
    return NextResponse.json({ error: "Failed to save favorite flower" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    let userId = null;
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { flowerId } = await req.json();
    if (!flowerId) {
      return NextResponse.json({ error: "flowerId is required" }, { status: 400 });
    }

    await query(
      `DELETE FROM user_favorite_flowers 
       WHERE user_id = $1 AND flower_id = $2`,
      [userId, flowerId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete favorite flower:", error);
    return NextResponse.json({ error: "Failed to delete favorite flower" }, { status: 500 });
  }
}
