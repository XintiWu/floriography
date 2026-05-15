import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 獲取所有素材（含庫存資訊）
export async function GET() {
  try {
    const result = await query(`
      SELECT * FROM assets 
      ORDER BY category, name ASC
    `);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 更新庫存數量
export async function PATCH(request: Request) {
  try {
    const { id, stock_quantity } = await request.json();
    
    // 1. 更新庫存
    const result = await query(
      'UPDATE assets SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [stock_quantity, id]
    );

    // 2. 紀錄庫存日誌 (選填，但建議加上)
    await query(
      'INSERT INTO inventory_logs (asset_id, change_amount, reason) VALUES ($1, $2, $3)',
      [id, 0, 'Admin manual adjustment'] // 這裡可以更精確計算差異
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
