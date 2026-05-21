import { sampleCards } from "@/lib/sampleData";

/** 花卡推特列表／詳情頁共用的卡片名稱顯示邏輯 */
export function getDisplayCardTitle(
  card: { card_title?: string | null },
  feedIndex: number
): string {
  if (card.card_title?.trim()) {
    return card.card_title.trim();
  }
  return sampleCards[feedIndex % sampleCards.length]?.title ?? "花語花卡";
}
