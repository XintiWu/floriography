import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST /api/cards/[id]/like — Increment like count of a card
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await query(
      `UPDATE shared_cards 
       SET like_count = COALESCE(like_count, 0) + 1 
       WHERE id = $1
       RETURNING like_count`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({ likeCount: result.rows[0].like_count });
  } catch (error) {
    console.error('Failed to like card:', error);
    return NextResponse.json({ error: 'Failed to like card' }, { status: 500 });
  }
}
