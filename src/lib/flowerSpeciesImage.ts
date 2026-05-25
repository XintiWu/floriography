import speciesImages from "@/data/flower_species_images.json";

const CATALOG_IMAGES = speciesImages as Record<string, string>;

/** 去背圖（需放在 public/FlowerDB_nobg/images/） */
const NOBG_BY_NAME: Array<{ match: (name: string) => boolean; src: string }> = [
  { match: (n) => n.includes("繡球花"), src: "/FlowerDB_nobg/images/IMG_9572_processed.png" },
  { match: (n) => n.includes("香水合歡"), src: "/FlowerDB_nobg/images/IMG_9631_processed.png" },
  { match: (n) => n.includes("星辰花"), src: "/FlowerDB_nobg/images/IMG_20260501_135711228_processed.png" },
  { match: (n) => n.includes("卡斯比亞"), src: "/FlowerDB_nobg/images/IMG_20260501_135615974_processed.png" },
  { match: (n) => n.includes("月季"), src: "/FlowerDB_nobg/images/IMG_9684_processed.png" },
  { match: (n) => n.includes("玫瑰"), src: "/FlowerDB_nobg/images/IMG_9713_processed.png" },
  { match: (n) => n.includes("九重葛"), src: "/FlowerDB_nobg/images/IMG_9708_processed.png" },
  { match: (n) => n.includes("仙丹花"), src: "/FlowerDB_nobg/images/IMG_20260501_142640520_processed.png" },
  { match: (n) => n.includes("台灣欒樹"), src: "/FlowerDB_nobg/images/IMG_9714_processed.png" },
  { match: (n) => n.includes("細葉雪茄花"), src: "/FlowerDB_nobg/images/IMG_9702_processed.png" },
  { match: (n) => n.includes("落羽杉"), src: "/FlowerDB_nobg/images/IMG_9711_processed.png" },
  { match: (n) => n.includes("鐵刀木"), src: "/FlowerDB_nobg/images/IMG_9709_processed.png" },
  { match: (n) => n.includes("兔仔菜"), src: "/FlowerDB_nobg/images/IMG_9681_processed.png" },
  { match: (n) => n.includes("大花咸豐草"), src: "/FlowerDB_nobg/images/IMG_20260501_134509973_processed.png" },
  { match: (n) => n.includes("櫻花"), src: "/FlowerDB_nobg/images/IMG_9606_processed.png" },
  { match: (n) => n.includes("馬蘭"), src: "/FlowerDB_nobg/images/IMG_9572_processed.png" },
  { match: (n) => n.includes("夏堇"), src: "/FlowerDB_nobg/images/IMG_9685_processed.png" },
  { match: (n) => n.includes("金魚草"), src: "/FlowerDB_nobg/images/IMG_9647_processed.png" },
  { match: (n) => n.includes("野毛蕨"), src: "/FlowerDB_nobg/images/IMG_20260501_142640520_processed.png" },
  { match: (n) => n.includes("風鈴花"), src: "/FlowerDB_nobg/images/IMG_9636_processed.png" },
  { match: (n) => n.includes("針葉櫻桃"), src: "/FlowerDB_nobg/images/IMG_8721_processed.png" },
  { match: (n) => n.includes("黃蝴蝶"), src: "/FlowerDB_nobg/images/IMG_9683_processed.png" },
  { match: (n) => n.includes("金英樹"), src: "/FlowerDB_nobg/images/IMG_9685_processed.png" },
  { match: (n) => n.includes("南美朱槿"), src: "/FlowerDB_nobg/images/IMG_8880_processed.png" },
  { match: (n) => n.includes("美國肖楠"), src: "/FlowerDB_nobg/images/IMG_8880_processed.png" },
  { match: (n) => n.includes("構樹"), src: "/FlowerDB_nobg/images/IMG_9625_processed.png" },
  { match: (n) => n.includes("垂枝茉莉"), src: "/FlowerDB_nobg/images/IMG_8737_processed.png" },
  { match: (n) => n.includes("泡盛草"), src: "/FlowerDB_nobg/images/IMG_20260501_142640520_processed.png" },
  { match: (n) => n.includes("天使花"), src: "/FlowerDB_nobg/images/IMG_9626_processed.png" },
  { match: (n) => n.includes("立鶴花"), src: "/FlowerDB_nobg/images/IMG_8877_processed.png" },
  { match: (n) => n.includes("新幾內亞鳳仙花"), src: "/FlowerDB_nobg/images/IMG_20260501_124640378_processed.png" },
  { match: (n) => n.includes("蒜香藤"), src: "/FlowerDB_nobg/images/IMG_9689_processed.png" },
];

const SORTED_CATALOG_KEYS = Object.keys(CATALOG_IMAGES).sort(
  (a, b) => b.length - a.length
);

/**
 * 花種縮圖 URL（優先 flowerCatalog 對照表 → 名稱部分比對 → 去背圖對照）。
 * 實體檔案需位於 public/FlowerDB/... 或 public/FlowerDB_nobg/...
 */
export function getFlowerSpeciesImageUrl(flowerName: string): string | null {
  const name = flowerName.trim();
  if (!name) return null;

  if (CATALOG_IMAGES[name]) return CATALOG_IMAGES[name];

  for (const key of SORTED_CATALOG_KEYS) {
    if (name.includes(key) || key.includes(name)) {
      return CATALOG_IMAGES[key];
    }
  }

  const nobg = NOBG_BY_NAME.find((r) => r.match(name));
  return nobg?.src ?? "/FlowerDB_nobg/images/IMG_8705_processed.png";
}
