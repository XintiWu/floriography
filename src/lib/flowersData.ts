import type { Flower } from "@/lib/types";
import flowerMeaningsData from "@/data/flower_meanings.json";
import { resolveFlowerStory } from "@/lib/flowerStory";

type FlowerMeaningsMap = Record<string, string[]>;

const MEANINGS = flowerMeaningsData as FlowerMeaningsMap;

function slugId(name: string): string {
  return `flower-${encodeURIComponent(name)}`;
}

let cache: Flower[] | null = null;

/**
 * 花種清單：以 flower_meanings.json 的鍵為準（與 cards.json 花材一致）。
 * 不再使用 sampleFlowers 的完整假資料列表。
 */
export function getFlowersFromData(): Flower[] {
  if (cache) return cache;

  cache = Object.keys(MEANINGS)
    .sort((a, b) => a.localeCompare(b, "zh-Hant"))
    .map((name) => ({
      id: slugId(name),
      name,
      meanings: [...MEANINGS[name]],
      story: resolveFlowerStory(name),
      relatedTags: MEANINGS[name].slice(0, 4),
    }));

  return cache;
}

/** flower_meanings.json 內的所有花種名稱 */
export function getCatalogFlowerNames(): string[] {
  return Object.keys(MEANINGS).sort((a, b) => a.localeCompare(b, "zh-Hant"));
}
