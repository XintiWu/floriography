import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { id, email, full_name, avatar_url } = await request.json();

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing user data' }, { status: 400 });
    }

    // 使用 UPSERT 邏輯：如果 user 已存在則更新，不存在則插入
    const sql = `
      INSERT INTO users (id, email, full_name, avatar_url)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE 
      SET full_name = EXCLUDED.full_name,
          avatar_url = EXCLUDED.avatar_url,
          email = EXCLUDED.email
      RETURNING *;
    `;

    const result = await query(sql, [id, email, full_name, avatar_url]);

    return NextResponse.json({ 
      success: true, 
      user: result.rows[0] 
    });
  } catch (error: any) {
    console.error('Auth sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
