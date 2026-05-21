import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST /api/cards/[id]/comment — Add comment to a card
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorName, text } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    const newComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      author_name: authorName?.trim() || '匿名花友',
      text: text.trim(),
      created_at: new Date().toISOString()
    };

    const result = await query(
      `UPDATE shared_cards 
       SET comments = COALESCE(comments, '[]'::jsonb) || $1::jsonb
       WHERE id = $2
       RETURNING comments`,
      [JSON.stringify([newComment]), id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({ comments: result.rows[0].comments });
  } catch (error) {
    console.error('Failed to add comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
