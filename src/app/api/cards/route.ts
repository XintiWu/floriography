import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/cards — fetch shared cards for the feed with pagination (public only!)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 12, 60); // Default to 12, max 60
    const offset = Number(searchParams.get('offset')) || 0;

    const result = await query(`
      SELECT id, image_data, card_title, personal_note, message, flower_names, flower_meanings, author_name, view_count, created_at,
             COALESCE(like_count, 0) AS like_count, COALESCE(comments, '[]'::jsonb) AS comments
      FROM shared_cards
      WHERE is_public = TRUE
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    return NextResponse.json({ cards: result.rows });
  } catch (error) {
    console.error('Failed to fetch shared cards:', error);
    return NextResponse.json({ cards: [] });
  }
}

// POST /api/cards — create a new shared card
export async function POST(req: NextRequest) {
  try {
    const { imageData, cardTitle, personalNote, message, flowerNames, flowerMeanings, authorName, isPublic } = await req.json();
    if (!imageData) {
      return NextResponse.json({ error: 'imageData is required' }, { status: 400 });
    }

    const id = `card-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    await query(
      `INSERT INTO shared_cards (id, image_data, card_title, personal_note, message, flower_names, flower_meanings, author_name, is_public, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        id,
        imageData,
        cardTitle || null,
        personalNote || null,
        message || '',
        flowerNames || [],
        flowerMeanings || [],
        authorName || '匿名花友',
        isPublic !== false, // Defaults to true if undefined, else strictly matches the boolean value
      ]
    );

    return NextResponse.json({ id });
  } catch (error) {
    console.error('Failed to save shared card:', error);
    return NextResponse.json({ error: 'Failed to save card' }, { status: 500 });
  }
}
