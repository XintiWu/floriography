import type { Card } from "@/lib/types";

const DEFAULT_CARD_STORY =
  "設計師精心挑選高質感實體壓花，揉合純粹自然的美學視角，透過多層次手工藝將植物的永恆姿態溫柔封存。";

/** 統一卡片敘述顯示（首頁/推薦/花語頁用同一套） */
export function getCardStoryText(card: Pick<Card, "description" | "blurb">): string {
  const d = card.description?.trim();
  if (d) return d;
  const b = card.blurb?.trim();
  if (b) return b;
  return DEFAULT_CARD_STORY;
}

