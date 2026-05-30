/** 右欄微調用標籤（UI 顯示；花語可加 # 前綴） */
export const FLOWER_MEANING_TAGS = [
  "康復",
  "長壽",
  "守護",
  "思念",
  "感謝",
  "希望",
  "鼓勵",
  "祝福",
  "平安",
  "健康",
  "堅韌",
  "喜悅",
  "真誠",
  "陪伴",
] as const;

/** 情緒氛圍 chip（表達「調性」，與花語意涵語意分離；勿與 FLOWER_MEANING_TAGS 重複） */
export const MOOD_ATMOSPHERE_TAGS = [
  "溫柔",
  "沉靜",
  "安定",
  "輕盈",
  "療癒",
  "明亮",
  "典雅",
  "清新",
] as const;

/** 兩欄標籤互斥：花語偏「意涵」，情緒偏「氛圍」 */
const TAG_MEANING_EXCLUSIVE = new Set<string>(FLOWER_MEANING_TAGS);
const TAG_MOOD_EXCLUSIVE = new Set<string>(MOOD_ATMOSPHERE_TAGS);

export type FlowerMeaningTag = (typeof FLOWER_MEANING_TAGS)[number];
export type MoodAtmosphereTag = (typeof MOOD_ATMOSPHERE_TAGS)[number];

const TAG_SEP = /[,，、\s]+/;

/** 合併為表單欄位字串（頓號分隔） */
export function joinTagsToField(tags: string[]): string {
  return tags
    .map((t) => t.trim())
    .filter(Boolean)
    .join("、");
}

/** 從欄位字串還原已選標籤（僅保留清單內已知項） */
export function parseFieldToKnownTags(
  value: string | undefined,
  allowed: readonly string[]
): string[] {
  if (!value?.trim()) return [];
  const parts = value.split(TAG_SEP).map((p) => p.trim()).filter(Boolean);
  const set = new Set(allowed);
  return [...new Set(parts.filter((p) => set.has(p)))];
}

/** 欄位中不在清單內的自訂片段（「其他」輸入用） */
export function parseFieldToCustomSuffix(
  value: string | undefined,
  allowed: readonly string[]
): string {
  if (!value?.trim()) return "";
  const parts = value.split(TAG_SEP).map((p) => p.trim()).filter(Boolean);
  const set = new Set(allowed);
  return parts.filter((p) => !set.has(p)).join("、");
}

export function mergeTagsAndCustom(tags: string[], custom: string): string {
  const known = joinTagsToField(tags);
  const extra = custom.trim();
  if (known && extra) return `${known}、${extra}`;
  return known || extra;
}

/** 從花語欄位移除屬於情緒標籤的詞（避免兩欄重複） */
export function meaningTagsFromField(
  flowerMeaning: string | undefined
): string[] {
  return parseFieldToKnownTags(flowerMeaning, FLOWER_MEANING_TAGS).filter(
    (t) => !TAG_MOOD_EXCLUSIVE.has(t)
  );
}

/** 從情緒欄位移除屬於花語標籤的詞 */
export function moodTagsFromField(mood: string | undefined): string[] {
  return parseFieldToKnownTags(mood, MOOD_ATMOSPHERE_TAGS).filter(
    (t) => !TAG_MEANING_EXCLUSIVE.has(t)
  );
}

export function customMeaningFromField(flowerMeaning: string | undefined): string {
  const parts = (flowerMeaning ?? "")
    .split(TAG_SEP)
    .map((p) => p.trim())
    .filter(Boolean);
  const known = new Set<string>([...FLOWER_MEANING_TAGS, ...MOOD_ATMOSPHERE_TAGS]);
  return parts.filter((p) => !known.has(p)).join("、");
}
