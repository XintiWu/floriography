import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`
      SELECT id, name, type, url, price, tags, metadata, is_active 
      FROM assets 
      WHERE is_active = true OR is_active IS NULL
      ORDER BY name ASC
    `);

    const assets = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      url: row.url,
      price: Number(row.price || 0),
      tags: row.tags || [],
      meaning: row.metadata?.meaning || undefined,
      description: row.metadata?.description || undefined,
      scientificName: row.metadata?.scientificName || undefined,
    }));

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Failed to fetch OCI assets:', error);
    return NextResponse.json({ assets: [] }, { status: 500 });
  }
}
