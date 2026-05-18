import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/cards — fetch all shared cards for the feed
export async function GET() {
  try {
    const result = await query(`
      SELECT id, image_data, card_title, personal_note, message, flower_names, flower_meanings, author_name, view_count, created_at
      FROM shared_cards
      ORDER BY created_at DESC
      LIMIT 60
    `);
    return NextResponse.json({ cards: result.rows });
  } catch (error) {
    console.error('Failed to fetch shared cards:', error);
    return NextResponse.json({ cards: [] });
  }
}

// POST /api/cards — create a new shared card
export async function POST(req: NextRequest) {
  try {
    const { imageData, cardTitle, personalNote, message, flowerNames, flowerMeanings, authorName } = await req.json();
    if (!imageData) {
      return NextResponse.json({ error: 'imageData is required' }, { status: 400 });
    }

    const id = `card-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    await query(
      `INSERT INTO shared_cards (id, image_data, card_title, personal_note, message, flower_names, flower_meanings, author_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        id,
        imageData,
        cardTitle || null,
        personalNote || null,
        message || '',
        flowerNames || [],
        flowerMeanings || [],
        authorName || '匿名花友',
      ]
    );

    return NextResponse.json({ id });
  } catch (error) {
    console.error('Failed to save shared card:', error);
    return NextResponse.json({ error: 'Failed to save card' }, { status: 500 });
  }
}
