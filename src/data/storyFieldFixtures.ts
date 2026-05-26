/**
 * 送禮情境 → 欄位解析測試（規則 + coerce，不呼叫 Ollama）
 * 執行：npx tsx scripts/test-parse-story-fields.ts
 */
import type { ParsedStoryFields } from "@/lib/parseStoryRules";

export type StoryFieldExpectation = {
  id: string;
  story: string;
  note: string;
  /** 必填欄位：必須與規則解析（經 coerce）結果一致 */
  must: Partial<ParsedStoryFields>;
  /** 選填：若解析有值則應符合 */
  should?: Partial<ParsedStoryFields>;
};

export const STORY_FIELD_FIXTURES: StoryFieldExpectation[] = [
  {
    id: "F1",
    story: "想送給受傷的兄弟早日康復的卡片",
    note: "修飾語 + 兄弟 + 康復",
    must: { recipient: "兄弟", occasion: "傷病", mood: "祝福" },
  },
  {
    id: "F2",
    story: "想送給受傷的摯友早日康復的卡片",
    note: "修飾語 + 摯友 + 康復",
    must: { recipient: "摯友", occasion: "傷病", mood: "祝福" },
  },
  {
    id: "F3",
    story: "送給即將畢業的摯友，希望粉色、帶鼓勵與希望的花語",
    note: "畢業 + 色調 + 花語",
    must: {
      recipient: "摯友",
      occasion: "畢業",
      mood: "鼓勵",
      color: "粉",
    },
    should: { flowerMeaning: "鼓勵與希望" },
  },
  {
    id: "F4",
    story: "紀念日和老婆過，香檳色，預算120",
    note: "配偶 + 紀念日 + 預算",
    must: { recipient: "老婆", occasion: "紀念日", color: "香檳", budget: 120 },
  },
  {
    id: "F5",
    story: "謝謝老師這學期的教導，要溫柔一點",
    note: "老師 + 溫柔",
    must: { recipient: "老師", occasion: "日常", mood: "溫柔" },
  },
  {
    id: "F6",
    story: "想送給剛升職的上司表示祝賀，預算150",
    note: "上司 + 升遷語境",
    must: { recipient: "上司", occasion: "加油", mood: "祝福", budget: 150 },
  },
  {
    id: "F7",
    story: "給女朋友一個驚喜，紀念日想要酒紅色",
    note: "女友 + 紀念日 + 紅",
    must: { recipient: "女朋友", occasion: "紀念日", color: "紅" },
  },
  {
    id: "F8",
    story: "妹妹考上台大，想送鼓勵的花",
    note: "妹妹 + 考試/加油",
    must: { recipient: "妹妹", occasion: "加油", mood: "鼓勵" },
  },
  {
    id: "F9",
    story: "鄰居阿姨幫忙顧狗，想用日常小禮表達感謝",
    note: "鄰居/阿姨 + 感謝",
    must: { recipient: "鄰居", occasion: "日常", mood: "祝福" },
  },
  {
    id: "F10",
    story: "想送給媽媽生日祝福，預算80元",
    note: "經典：媽媽生日預算",
    must: { recipient: "媽媽", occasion: "生日", budget: 80 },
  },
  {
    id: "F11",
    story: "想送給男朋友情人節禮物 謝謝他願意跟我在一起",
    note: "情人節+謝謝→感謝花語",
    must: {
      recipient: "男朋友",
      occasion: "紀念日",
      flowerMeaning: "感謝",
    },
  },
];

export function getStoryFieldFixtures(ids?: string[]): StoryFieldExpectation[] {
  if (!ids?.length) return STORY_FIELD_FIXTURES;
  const set = new Set(ids.map((s) => s.trim()));
  return STORY_FIELD_FIXTURES.filter((f) => set.has(f.id));
}
