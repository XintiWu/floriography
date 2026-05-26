/**
 * 情境推薦常用測試 prompt（benchmark / 本機驗收共用）
 * 執行：npx tsx scripts/benchmark-recommend-prompts.ts
 * 指定：npx tsx scripts/benchmark-recommend-prompts.ts --only P1,P3
 */
export type RecommendPromptFixture = {
  id: string;
  story: string;
  note: string;
  tags: string[];
};

export const RECOMMEND_PROMPT_FIXTURES: RecommendPromptFixture[] = [
  {
    id: "P1",
    story: "想送給媽媽生日祝福，預算80元",
    note: "對象+場合+預算",
    tags: ["媽媽", "生日", "預算"],
  },
  {
    id: "P2",
    story: "想送給受傷的兄弟早日康復的卡片",
    note: "修飾語+兄弟+康復（對齊 F1）",
    tags: ["兄弟", "康復", "祝福"],
  },
  {
    id: "P3",
    story: "送給即將畢業的摯友，希望粉色、帶鼓勵與希望的花語",
    note: "色調+情緒+花語",
    tags: ["畢業", "粉色", "鼓勵"],
  },
  {
    id: "P4",
    story: "紀念日和老婆過，香檳色，預算120",
    note: "紀念日+色調+預算",
    tags: ["紀念日", "香檳色", "預算"],
  },
  {
    id: "P5",
    story: "謝謝老師這學期的教導，要溫柔一點",
    note: "對象+情緒",
    tags: ["老師", "溫柔", "感謝"],
  },
  {
    id: "P6",
    story: "想送一份特別的禮物",
    note: "欄位稀疏、測補位",
    tags: ["泛用"],
  },
];

/** 與 P1 類似、利於重複測速的變體 */
export const RECOMMEND_PROMPT_VARIANTS: RecommendPromptFixture[] = [
  {
    id: "V1-mom-birthday",
    story: "想送給媽媽生日祝福，預算80元",
    note: "同 P1，測重複請求",
    tags: ["媽媽", "生日"],
  },
  {
    id: "V2-mom-birthday-alt",
    story: "媽媽生日快到了，預算大概八十，想要祝福的感覺",
    note: "P1 口語變體",
    tags: ["媽媽", "生日"],
  },
];

export function getPromptFixtures(ids?: string[]): RecommendPromptFixture[] {
  const all = [...RECOMMEND_PROMPT_FIXTURES, ...RECOMMEND_PROMPT_VARIANTS];
  if (!ids?.length) return RECOMMEND_PROMPT_FIXTURES;
  const set = new Set(ids.map((s) => s.trim()));
  return all.filter((p) => set.has(p.id));
}
