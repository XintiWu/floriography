import flowerMeaningsData from "@/data/flower_meanings.json";

export type FlowerMeaningsMap = Record<string, string[]>;

const MEANINGS = flowerMeaningsData as FlowerMeaningsMap;

/** 與建置腳本一致的花名別名 */
const FLOWER_MEANING_ALIASES: Record<string, string> = {
  米香花: "米粒",
  針葉櫻桃葉: "針葉櫻桃",
  朱槿葉: "南美朱槿",
  玫瑰葉: "玫瑰",
  白櫻花: "白色櫻花",
};

const SORTED_KEYS = Object.keys(MEANINGS).sort((a, b) => b.length - a.length);

/** 從 flower_meanings.json 解析花種的完整花語列表 */
export function getAllFlowerMeaningLabels(flowerName: string): string[] {
  const trimmed = flowerName.trim();
  if (!trimmed) return [];

  const candidates = [
    FLOWER_MEANING_ALIASES[trimmed],
    trimmed,
  ].filter((k): k is string => Boolean(k));

  for (const key of candidates) {
    const list = MEANINGS[key];
    if (list?.length) return [...list];
  }

  for (const key of SORTED_KEYS) {
    if (trimmed.includes(key) || key.includes(trimmed)) {
      return [...MEANINGS[key]];
    }
  }

  return [];
}

/**
 * 從 flower_meanings.json 取得花種花語；無資料時 fallback 至傳入的 meanings。
 */
export function resolveFlowerMeanings(
  flowerName: string,
  fallbackMeanings: string[] = []
): string[] {
  const fromJson = getAllFlowerMeaningLabels(flowerName);
  if (fromJson.length > 0) return fromJson;
  return fallbackMeanings.length > 0 ? [...fallbackMeanings] : ["祝福"];
}

/**
 * 精簡花語（預設最多 3 則，用於花種橫列等）。
 */
export function getFlowerMeaningLabels(
  flowerName: string,
  max = 3
): string[] {
  return resolveFlowerMeanings(flowerName).slice(0, max);
}
