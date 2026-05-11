import type { Card, Flower } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sampleCards, sampleFlowers } from "@/lib/sampleData";

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
  const supabase = createSupabaseServerClient();
  if (!supabase) return sampleCards;

  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return sampleCards;
  return ((data ?? []) as CardRow[]).map(mapCard);
}

export async function getCardById(id: string): Promise<Card | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return sampleCards.find((c) => c.id === id) ?? null;

  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return data ? mapCard(data as CardRow) : null;
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

