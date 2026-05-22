import type { Card, Flower } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sampleCards, sampleFlowers } from "@/lib/sampleData";
import { isDbConfigured, query } from "@/lib/db";

type CardRow = {
  id: string;
  title: string;
  price_twd: number;
  status: Card["status"];
  images: string[] | null;
  size: string | null;
  materials: string[] | null;
  lead_time_days: number | null;
  blurb: string | null;
  tags_occasions: string[] | null;
  tags_colors: string[] | null;
  tags_flowers: string[] | null;
  tags_moods: string[] | null;
};

type FlowerRow = {
  id: string;
  name: string;
  meanings: string[] | null;
  story: string | null;
  related_tags: string[] | null;
};

function mapCard(row: CardRow): Card {
  return {
    id: row.id,
    title: row.title,
    priceTwd: row.price_twd,
    status: row.status,
    images: row.images ?? [],
    size: row.size ?? undefined,
    materials: row.materials ?? [],
    leadTimeDays:
      typeof row.lead_time_days === "number" ? row.lead_time_days : undefined,
    blurb: row.blurb ?? undefined,
    tags: {
      occasions: row.tags_occasions ?? [],
      colors: row.tags_colors ?? [],
      flowers: row.tags_flowers ?? [],
      moods: row.tags_moods ?? [],
    },
  };
}

function mapFlower(row: FlowerRow): Flower {
  return {
    id: row.id,
    name: row.name,
    meanings: row.meanings ?? [],
    story: row.story ?? undefined,
    relatedTags: row.related_tags ?? [],
  };
}

export async function getCards(): Promise<Card[]> {
  if (!isDbConfigured()) return sampleCards;

  try {
    const result = await query(`
      SELECT * FROM designs 
      ORDER BY created_at DESC
    `);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      title: row.name,
      priceTwd: row.total_price,
      status: "available", // 預設為可售
      images: [row.preview_url].filter(Boolean),
      blurb: row.description,
      tags: { occasions: [], colors: [], flowers: [], moods: [] }
    }));
  } catch (err) {
    console.error("Failed to fetch cards from OCI:", err);
    return sampleCards;
  }
}

export async function getCardById(id: string): Promise<Card | null> {
  if (!isDbConfigured()) return sampleCards.find((c) => c.id === id) ?? null;

  try {
    const result = await query(`
      SELECT * FROM designs 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      title: row.name,
      priceTwd: row.total_price,
      status: "available",
      images: [row.preview_url].filter(Boolean),
      blurb: row.description,
      tags: { occasions: [], colors: [], flowers: [], moods: [] }
    };
  } catch (err) {
    console.error("Failed to fetch card by ID from OCI:", err);
    return sampleCards.find(c => c.id === id) || null;
  }
}

export async function getFlowers(): Promise<Flower[]> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return sampleFlowers;

  const { data, error } = await supabase
    .from("flowers")
    .select("*")
    .order("name", { ascending: true })
    .limit(300);
  if (error) return sampleFlowers;
  return ((data ?? []) as FlowerRow[]).map(mapFlower);
}

export async function getFlowerById(id: string): Promise<Flower | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return sampleFlowers.find((f) => f.id === id) ?? null;

  const { data, error } = await supabase
    .from("flowers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data ? mapFlower(data as FlowerRow) : null;
}

