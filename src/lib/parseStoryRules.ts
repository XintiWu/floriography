export const OCCASION_OPTIONS = ["生日", "畢業", "加油", "紀念日", "日常"] as const;
export const MOOD_OPTIONS = ["溫柔", "祝福", "鼓勵", "希望", "思念", "安定"] as const;

export type ParsedStoryFields = {
  recipient?: string;
  occasion?: string;
  mood?: string;
  budget?: number;
  color?: string;
  flowerMeaning?: string;
};

const OCCASION_KEYWORDS: Record<string, string[]> = {
  生日: ["生日", "壽", "過生", "週歲", "壽星"],
  畢業: ["畢業", "畢典", "學位", "授袍"],
  加油: ["加油", "應試", "考試", "面試", "升遷", "比賽"],
  紀念日: ["紀念", "週年", "情人節", "婚禮", "求婚", "表白", "周年", "紀念日"],
  日常: ["日常", "感謝", "謝謝", "道歉", "慰問", "探病"],
};

const MOOD_KEYWORDS: Record<string, string[]> = {
  溫柔: ["溫柔", "柔和", "暖", "療癒", "貼心"],
  祝福: ["祝福", "祝賀", "美滿", "喜悅", "開心"],
  鼓勵: ["鼓勵", "打氣", "勇氣", "堅強", "支持"],
  希望: ["希望", "前程", "未來", "光明", "新開始"],
  思念: ["思念", "想念", "懷念", "牽掛"],
  安定: ["安定", "平靜", "陪伴", "守護", "穩重"],
};

const RECIPIENT_KEYWORDS: Array<[string, string[]]> = [
  ["媽媽", ["媽媽", "母親", "媽咪", "老母", "媽", "阿母"]],
  ["爸爸", ["爸爸", "父親", "老爸", "爸", "阿爸"]],
  ["奶奶", ["奶奶", "阿嬤", "祖母", "外婆", "姥姥"]],
  ["爺爺", ["爺爺", "阿公", "祖父", "外公"]],
  ["戀人", ["男友", "女友", "另一半", "老公", "老婆", "丈夫", "妻子", "戀人", "情人", "伴侶", "男朋友", "女朋友"]],
  ["朋友", ["朋友", "閨蜜", "同學", "同事", "摯友", "好友", "閨蜜"]],
  ["老師", ["老師", "導師", "教授", "班導"]],
  ["孩子", ["孩子", "兒子", "女兒", "小孩", "寶寶", "孫子", "孫女"]],
  ["自己", ["自己", "送我", "給自己"]],
];

/** 長詞優先，避免「粉紅」只吃到「粉」前就誤判 */
const COLOR_KEYWORDS: Array<[string, string[]]> = [
  ["香檳", ["香檳色", "香檳"]],
  ["奶油", ["奶油色", "奶油", "米色", "米白"]],
  ["粉", ["粉紅", "粉色", "粉調", "粉彩", "玫瑰粉"]],
  ["白", ["白色", "純白", "雪白"]],
  ["黃", ["黃色", "金黃", "金色", "金"]],
  ["紅", ["紅色", "酒紅", "玫紅", "桃紅"]],
  ["藍", ["藍色", "天藍", "海藍"]],
  ["紫", ["紫色", "淡紫"]],
  ["綠", ["綠色", "抹茶"]],
  ["橘", ["橘色", "橙色", "橘"]],
  ["黑", ["黑色"]],
];

function pickByKeywords(text: string, map: Record<string, string[]>): string | undefined {
  for (const [label, keys] of Object.entries(map)) {
    if (keys.some((k) => text.includes(k))) return label;
  }
  return undefined;
}

function parseColor(text: string): string | undefined {
  for (const [label, keys] of COLOR_KEYWORDS) {
    if (keys.some((k) => text.includes(k))) return label;
  }
  return undefined;
}

function parseBudget(text: string): number | undefined {
  const patterns = [
    /(?:預算|上限|不超過|大約|約|大概|控制在)\s*(\d{2,5})\s*(?:元|塊|块|台幣|nt|NTD)?/i,
    /(\d{2,5})\s*(?:元|塊|块|台幣)/,
    /NT\s*\$?\s*(\d{2,5})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return undefined;
}

/** 從「送給／給 XXX」截取對象（短詞） */
function parseRecipientPhrase(text: string): string | undefined {
  const patterns = [
    /送給[「『"']?([^「」『』"'，。！!?\n\s]{1,10})/,
    /要送給[「『"']?([^「」『』"'，。！!?\n\s]{1,10})/,
    /給[「『"']?([^「」『』"'，。！!?\n\s]{1,10}?)(?:的|，|,|。|！|!|當|做|一份)/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const raw = m[1].replace(/[的]$/, "").trim();
      if (raw.length >= 1 && raw.length <= 10) return raw;
    }
  }
  return undefined;
}

function parseRecipientByKeywords(text: string): string | undefined {
  const entry = RECIPIENT_KEYWORDS.find(([, keys]) => keys.some((k) => text.includes(k)));
  return entry?.[0];
}

export function parseStoryWithRules(story: string): ParsedStoryFields {
  const t = story.trim();
  if (!t) return {};

  return {
    recipient: parseRecipientByKeywords(t) ?? parseRecipientPhrase(t),
    occasion: pickByKeywords(t, OCCASION_KEYWORDS),
    mood: pickByKeywords(t, MOOD_KEYWORDS),
    budget: parseBudget(t),
    color: parseColor(t),
  };
}

export function sanitizeParsedFields(
  raw: Partial<ParsedStoryFields>
): ParsedStoryFields {
  const out: ParsedStoryFields = {};
  if (raw.recipient?.trim()) out.recipient = raw.recipient.trim().slice(0, 40);
  if (raw.occasion && OCCASION_OPTIONS.includes(raw.occasion as (typeof OCCASION_OPTIONS)[number])) {
    out.occasion = raw.occasion;
  }
  if (raw.mood && MOOD_OPTIONS.includes(raw.mood as (typeof MOOD_OPTIONS)[number])) {
    out.mood = raw.mood;
  }
  if (typeof raw.budget === "number" && raw.budget > 0) {
    out.budget = Math.round(raw.budget);
  }
  if (raw.color?.trim()) out.color = raw.color.trim().slice(0, 12);
  if (raw.flowerMeaning?.trim()) {
    out.flowerMeaning = raw.flowerMeaning.trim().slice(0, 80);
  }
  return out;
}
