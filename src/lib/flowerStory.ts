import flowerStoryData from "@/data/flower_story.json";

const STORIES = flowerStoryData as Record<string, string>;

/** 花名別名 → flower_story.json 鍵 */
const FLOWER_STORY_ALIASES: Record<string, string> = {
  白色櫻花: "白櫻花",
};

const SORTED_KEYS = Object.keys(STORIES).sort((a, b) => b.length - a.length);

/**
 * 從 flower_story.json 取得「適合的花與典故故事」內文。
 */
export function resolveFlowerStory(
  flowerName: string,
  fallbackStory?: string
): string | undefined {
  const trimmed = flowerName.trim();
  if (!trimmed) return fallbackStory;

  const candidates = [
    FLOWER_STORY_ALIASES[trimmed],
    trimmed,
  ].filter((k): k is string => Boolean(k));

  for (const key of candidates) {
    const text = STORIES[key]?.trim();
    if (text) return text;
  }

  for (const key of SORTED_KEYS) {
    if (trimmed.includes(key) || key.includes(trimmed)) {
      const text = STORIES[key]?.trim();
      if (text) return text;
    }
  }

  return fallbackStory?.trim() || undefined;
}
