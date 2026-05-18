import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/cards/[id] — fetch a single card including image
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Increment view count and return card data
    await query(
      `UPDATE shared_cards SET view_count = view_count + 1 WHERE id = $1`,
      [id]
    );

    const result = await query(
      `SELECT id, image_data, card_title, personal_note, message, flower_names, flower_meanings, author_name, view_count, created_at
       FROM shared_cards WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({ card: result.rows[0] });
  } catch (error) {
    console.error('Failed to fetch card:', error);
    return NextResponse.json({ error: 'Failed to fetch card' }, { status: 500 });
  }
}
