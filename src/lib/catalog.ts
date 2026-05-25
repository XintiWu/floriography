import type { Card, Flower } from "@/lib/types";
import { getCardFromDataById, getCardsFromData } from "@/lib/cardsData";
import { getFlowersFromData } from "@/lib/flowersData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDbConfigured } from "@/lib/dbConfig";
import { query } from "@/lib/db";

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

function getTagsForDesign(id: string, name: string, description: string) {
  const sample = getCardsFromData().find(c => c.id === id);
  if (sample) {
    return sample.tags;
  }
  
  const flowersList = [
    "九里香", "九里香葉", "九重葛", "兔仔菜", "南美朱槿", "卡斯比亞", "台灣欒樹",
    "垂枝茉莉", "夏堇", "大花咸豐草", "延藥睡蓮", "彩葉莧", "探索天使花", "新幾內亞鳳仙花",
    "星辰花", "月季", "構樹", "水晶花", "玫瑰", "紅楓", "紅櫻花", "紫花蘆莉草",
    "紫苞舌蘭", "細葉雪茄花", "繡球花", "美國肖楠", "花材", "落羽杉", "血萼花",
    "野毛蕨", "金魚草", "鐵刀木", "風鈴花", "香水合歡", "馬蘭", "黃蝴蝶", "龍吐珠"
  ];
  const occasionsList = ["生日", "日常", "畢業", "加油", "紀念日", "思念", "祝福", "送禮"];
  const colorsList = ["粉", "黃", "奶油白", "綠", "白", "橘", "黑", "紫", "藍", "紅", "棕"];
  const moodsList = ["溫柔", "祝福", "鼓勵", "希望", "思念", "安定", "青春", "勇氣", "吉祥", "自由", "熱情", "耐心"];
  
  const textToScan = `${name} ${description || ""}`;
  const matchedFlowers = flowersList.filter(f => textToScan.includes(f));
  const matchedOccasions = occasionsList.filter(o => textToScan.includes(o));
  const matchedColors = colorsList.filter(c => textToScan.includes(c));
  const matchedMoods = moodsList.filter(m => textToScan.includes(m));
  
  return {
    occasions: matchedOccasions,
    colors: matchedColors,
    flowers: matchedFlowers,
    moods: matchedMoods.length > 0 ? matchedMoods : ["溫柔"]
  };
}

function enrichCard(row: any): Card {
  const sample = getCardsFromData().find(c => c.id === row.id);
  const description = row.description || "";
  
  return {
    id: row.id,
    title: row.name,
    priceTwd: typeof row.total_price === "number" ? row.total_price : Number(row.total_price || 0),
    status: sample?.status || "available",
    images: [row.preview_url].filter(Boolean),
    size: sample?.size || "約 10×15 cm",
    materials: sample?.materials || ["壓花", "紙材"],
    leadTimeDays: sample?.leadTimeDays ?? 3,
    blurb: row.description || sample?.blurb,
    tags: getTagsForDesign(row.id, row.name, description)
  };
}

export async function getCards(): Promise<Card[]> {
  if (!isDbConfigured()) return getCardsFromData();
  try {
    const result = await query(`
      SELECT * FROM designs 
      ORDER BY created_at DESC
    `);
    
    if (result.rows.length === 0) return getCardsFromData();
    return result.rows.map(enrichCard);
  } catch (err) {
    console.error("Failed to fetch cards from OCI:", err);
    return getCardsFromData();
  }
}

export async function getCardById(id: string): Promise<Card | null> {
  if (!isDbConfigured()) return getCardFromDataById(id);
  try {
    const result = await query(`
      SELECT * FROM designs 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return getCardsFromData().find(c => c.id === id) || null;
    }
    
    return enrichCard(result.rows[0]);
  } catch (err) {
    console.error("Failed to fetch card by ID from OCI:", err);
    return getCardFromDataById(id);
  }
}

export async function getFlowers(): Promise<Flower[]> {
  // 1. Try OCI Database if configured
  if (isDbConfigured()) {
    try {
      const result = await query(`
        SELECT DISTINCT ON (name) id, name, url, metadata 
        FROM assets 
        WHERE type = 'flower' AND is_active = true 
        ORDER BY name, id
      `);
      
      if (result.rows.length > 0) {
        return result.rows.map((row: any) => {
          const meta = row.metadata || {};
          let meanings: string[] = [];
          if (typeof meta.meaning === "string") {
            meanings = meta.meaning.split(/[、,，\s]+/).filter(Boolean);
          } else if (Array.isArray(meta.meaning)) {
            meanings = meta.meaning;
          }
          
          return {
            id: row.id,
            name: row.name,
            meanings: meanings.length > 0 ? meanings : ["祝福"],
            story: meta.description || undefined,
            imageUrl: row.url || undefined,
            scientificName: meta.scientificName || undefined,
            relatedTags: meanings
          };
        });
      }
    } catch (err) {
      console.error("Failed to fetch flowers from OCI:", err);
    }
  }

  // 2. Try Supabase
  const supabase = createSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("flowers")
        .select("*")
        .order("name", { ascending: true })
        .limit(300);
      if (!error && data) {
        return (data as FlowerRow[]).map(mapFlower);
      }
    } catch (err) {
      console.error("Failed to fetch flowers from Supabase:", err);
    }
  }

  // 3. Fallback to local data
  return getFlowersFromData();
}

export async function getFlowerById(id: string): Promise<Flower | null> {
  // 1. Try OCI Database if configured
  if (isDbConfigured()) {
    try {
      const result = await query(`
        SELECT * FROM assets 
        WHERE type = 'flower' AND id = $1
      `, [id]);
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const meta = row.metadata || {};
        let meanings: string[] = [];
        if (typeof meta.meaning === "string") {
          meanings = meta.meaning.split(/[、,，\s]+/).filter(Boolean);
        } else if (Array.isArray(meta.meaning)) {
          meanings = meta.meaning;
        }
        
        return {
          id: row.id,
          name: row.name,
          meanings: meanings.length > 0 ? meanings : ["祝福"],
          story: meta.description || undefined,
          imageUrl: row.url || undefined,
          scientificName: meta.scientificName || undefined,
          relatedTags: meanings
        };
      }
    } catch (err) {
      console.error("Failed to fetch flower by ID from OCI:", err);
    }
  }

  // 2. Try Supabase
  const supabase = createSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("flowers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!error && data) {
        return mapFlower(data as FlowerRow);
      }
    } catch (err) {
      console.error("Failed to fetch flower by ID from Supabase:", err);
    }
  }

  // 3. Fallback to local data
  return getFlowersFromData().find((f) => f.id === id) ?? null;
}
