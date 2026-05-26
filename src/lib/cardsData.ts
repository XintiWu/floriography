import cardsJson from "@/data/cards.json";
import type { Card } from "@/lib/types";

type CardJsonRow = Card & { indexText?: string };

type CardsFile = {
  cards: CardJsonRow[];
};

let cache: Card[] | null = null;

/** 從 src/data/cards.json 載入實際卡片清單（不含 indexText） */
export function getCardsFromData(): Card[] {
  if (!cache) {
    const { cards } = cardsJson as CardsFile;
    cache = cards.map((row) => ({
      id: row.id,
      title: row.title,
      priceTwd: row.priceTwd,
      status: row.status,
      images: row.images ?? [],
      size: row.size,
      materials: row.materials,
      leadTimeDays: row.leadTimeDays,
      tags: row.tags,
      blurb: row.blurb,
      description: row.description,
    }));
  }
  return cache;
}

export function getCardFromDataById(id: string): Card | null {
  return getCardsFromData().find((c) => c.id === id) ?? null;
}
