import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`
      SELECT * FROM designs 
      ORDER BY created_at DESC
    `);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, preview_url, total_price } = body;
    const id = `card-${Date.now()}`;
    
    await query(`
      INSERT INTO designs (id, name, description, preview_url, total_price)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, name, description, preview_url, total_price]);
    
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name, description, preview_url, total_price } = body;
    
    await query(`
      UPDATE designs 
      SET name = $2, description = $3, preview_url = $4, total_price = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id, name, description, preview_url, total_price]);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    
    await query('DELETE FROM designs WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
