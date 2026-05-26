import type { Asset, AssetType } from "@/types";
import flowerMeanings from "@/data/flower_meanings.json";
import speciesImages from "@/data/flower_species_images.json";

const KRAFT_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560"><rect width="100%" height="100%" fill="#c4a574"/></svg>'
);
const WHITE_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560"><rect width="100%" height="100%" fill="#f7f4ef"/><rect x="8" y="8" width="384" height="544" fill="none" stroke="#e8e2d8" stroke-width="2"/></svg>'
);

const CARD_BACKGROUNDS: Asset[] = [
  {
    id: "card-kraft-brown",
    name: "Kraft Brown",
    type: "card",
    url: `data:image/svg+xml,${KRAFT_SVG}`,
    price: 45,
    tags: ["經典", "牛皮"],
  },
  {
    id: "card-classic-white",
    name: "Classic White",
    type: "card",
    url: `data:image/svg+xml,${WHITE_SVG}`,
    price: 45,
    tags: ["經典", "素色"],
  },
];

/** 本機 dev：從 FlowerDB 花種對照表產生工作室壓花素材 */
export function getStudioAssetsFallback(): Asset[] {
  const meanings = flowerMeanings as Record<string, string[]>;
  const images = speciesImages as Record<string, string>;

  const flowers: Asset[] = Object.entries(images).map(([name, url]) => ({
    id: `flower-${name}`,
    name,
    type: "flower" as const,
    url,
    price: 8,
    tags: meanings[name]?.slice(0, 4) ?? ["壓花"],
    meaning: meanings[name]?.[0],
  }));

  return [...CARD_BACKGROUNDS, ...flowers];
}

function normalizeAssetType(raw: unknown): AssetType {
  const s = String(raw ?? "flower").toLowerCase();
  if (s.includes("card") || s.includes("底")) return "card";
  if (s.includes("text") || s.includes("字")) return "text";
  return "flower";
}

/** 將 OCI assets 資料列轉成工作室 Asset（相容舊欄位 category / 新欄位 type） */
export function mapDbRowToAsset(row: Record<string, unknown>): Asset {
  const meta =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};

  const tagsRaw = row.tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map(String)
    : typeof tagsRaw === "string"
      ? [tagsRaw]
      : [];

  return {
    id: String(row.id),
    name: String(row.name ?? "未命名"),
    type: normalizeAssetType(row.type ?? row.category),
    url: String(row.url ?? ""),
    price: Number(row.price ?? 0),
    tags,
    meaning:
      typeof meta.meaning === "string"
        ? meta.meaning
        : typeof row.meaning === "string"
          ? row.meaning
          : undefined,
    description:
      typeof meta.description === "string" ? meta.description : undefined,
    scientificName:
      typeof meta.scientificName === "string" ? meta.scientificName : undefined,
  };
}
