export const OCCASION_OPTIONS = ["生日", "畢業", "加油", "紀念日", "傷病", "日常"] as const;
export const MOOD_OPTIONS = [
  "溫柔",
  "祝福",
  "鼓勵",
  "希望",
  "思念",
  "安定",
  "療癒",
  "感謝",
  "沉靜",
  "輕盈",
  "明亮",
  "典雅",
  "清新",
] as const;

/** chip / UI 情緒詞 → 粗排用標準情緒（作品庫標籤較少） */
export const MOOD_SCORING_ALIAS: Record<string, string> = {
  沉靜: "安定",
  輕盈: "溫柔",
  療癒: "祝福",
  明亮: "祝福",
  典雅: "安定",
  清新: "溫柔",
};

export function splitTagField(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[,，、\s]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 1);
}

export function normalizeMoodPartForScoring(part: string): string {
  const t = part.trim();
  return MOOD_SCORING_ALIAS[t] ?? t;
}

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
  加油: ["加油", "應試", "考試", "面試", "升遷", "升職", "比賽", "上台", "錄取"],
  紀念日: ["紀念日", "紀念", "週年", "情人節", "婚禮", "求婚", "表白", "周年"],
  傷病: ["慰問", "探病", "康復", "早日康復", "養病", "住院", "出院", "手術", "受傷", "生病", "骨折", "感冒", "過敏", "不舒服"],
  日常: ["日常", "感謝", "謝謝", "道歉"],
};

const MOOD_KEYWORDS: Record<string, string[]> = {
  溫柔: ["溫柔", "柔和", "療癒", "貼心", "暖心"],
  祝福: ["祝福", "祝賀", "美滿", "喜悅", "開心", "康復", "早日康復", "平安", "健康", "感謝"],
  鼓勵: ["鼓勵", "打氣", "勇氣", "堅強", "支持", "加油"],
  希望: ["希望", "前程", "未來", "光明", "新開始"],
  思念: ["思念", "想念", "懷念", "牽掛"],
  安定: ["安定", "平靜", "陪伴", "守護", "穩重"],
  療癒: ["療癒", "放鬆", "舒心", "療傷", "安撫"],
  感謝: ["感謝", "謝謝", "感恩", "多謝"],
  沉靜: ["沉靜", "寧靜", "靜謐", "安靜"],
  輕盈: ["輕盈", "輕快", "清爽"],
  明亮: ["明亮", "陽光", "開朗"],
  典雅: ["典雅", "大方", "莊重"],
  清新: ["清新", "清爽", "自然"],
};

/** 送禮對象詞彙（長詞優先匹配；回傳原文命中的詞，非分類名） */
const RECIPIENT_TERMS: string[] = [
  "男朋友",
  "女朋友",
  "另一半",
  "未婚妻",
  "未婚夫",
  "婆婆",
  "岳父",
  "岳母",
  "公公",
  "阿嬤",
  "阿公",
  "外婆",
  "姥姥",
  "祖母",
  "祖父",
  "孫子",
  "孫女",
  "摯友",
  "閨蜜",
  "同事",
  "同學",
  "室友",
  "鄰居",
  "學姐",
  "學長",
  "學弟",
  "妹妹",
  "姐姐",
  "弟弟",
  "哥哥",
  "兄弟",
  "姊妹",
  "姐妹",
  "老師",
  "導師",
  "教授",
  "班導",
  "上司",
  "老闆",
  "主管",
  "客戶",
  "媽媽",
  "母親",
  "媽咪",
  "老爸",
  "爸爸",
  "父親",
  "奶奶",
  "爺爺",
  "老公",
  "老婆",
  "丈夫",
  "妻子",
  "戀人",
  "情人",
  "伴侶",
  "男友",
  "女友",
  "阿姨",
  "叔叔",
  "舅舅",
  "姑姑",
  "朋友",
  "好友",
  "兒子",
  "女兒",
  "孩子",
  "小孩",
  "寶寶",
  "自己",
].sort((a, b) => b.length - a.length);

const RECIPIENT_SEGMENT_MODIFIERS =
  /(?:受傷的|生病的|即將畢業的|親愛的|親愛|我的|一位|好)+/g;

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

function pickByKeywordsLongest(
  text: string,
  map: Record<string, string[]>
): string | undefined {
  let bestKey: string | undefined;
  let bestLabel: string | undefined;
  for (const [label, keys] of Object.entries(map)) {
    for (const k of keys) {
      if (text.includes(k) && (!bestKey || k.length > bestKey.length)) {
        bestKey = k;
        bestLabel = label;
      }
    }
  }
  return bestLabel;
}

function parseColor(text: string): string | undefined {
  let best: { label: string; len: number } | undefined;
  for (const [label, keys] of COLOR_KEYWORDS) {
    for (const k of keys) {
      if (text.includes(k) && (!best || k.length > best.len)) {
        best = { label, len: k.length };
      }
    }
  }
  return best?.label;
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

function longestRecipientInText(text: string): string | undefined {
  let best: string | undefined;
  for (const term of RECIPIENT_TERMS) {
    if (!text.includes(term)) continue;
    if (!best || term.length > best.length) best = term;
  }
  return best;
}

/** 在「送給…」片段內找對象詞 */
function parseRecipientInGiftSegment(text: string): string | undefined {
  const m = text.match(/(?:想|要)?送(?:給|到)[「『"']?([^，。！!?\n]{1,28})/);
  if (!m?.[1]) return undefined;
  const segment = m[1].replace(RECIPIENT_SEGMENT_MODIFIERS, "");
  return longestRecipientInText(segment);
}

function parseRecipientPhrase(text: string): string | undefined {
  const fromSegment = parseRecipientInGiftSegment(text);
  if (fromSegment) return fromSegment;

  const m = text.match(/給[「『"']?([^「」『』"'，。！!?\n]{1,16}?)(?:的|，|,|。|！|!|當|做|一份)/);
  if (!m?.[1]) return undefined;
  const segment = m[1].replace(RECIPIENT_SEGMENT_MODIFIERS, "").trim();
  return longestRecipientInText(segment) ?? (segment.length >= 2 && segment.length <= 8 ? segment : undefined);
}

function parseRecipient(text: string): string | undefined {
  return longestRecipientInText(text) ?? parseRecipientInGiftSegment(text) ?? parseRecipientPhrase(text);
}

/** 從「帶…花語」「希望…」等抽出花語關鍵字 */
function parseFlowerMeaning(text: string): string | undefined {
  const patterns = [
    /帶(?:著)?([^，。！!?\n]{2,24}?)(?:的)?花語/,
    /(?:希望|想要|要)([^，。！!?\n]{2,20}?)(?:的)?花語/,
    /花語[是為：:]\s*([^，。！!?\n]{2,24})/,
    /傳達([^，。！!?\n]{2,16}?)(?:的)?心意/,
    /(?:祝福|鼓勵|希望|感謝|思念|平安|康復|健康)(?:與|及|和)?(?:祝福|鼓勵|希望|感謝|思念|平安|康復|健康)?/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const raw = m[1].replace(/[的、，]+$/, "").trim();
      if (raw.length >= 2 && raw.length <= 40) return raw.slice(0, 80);
    }
  }
  const moodHits = ["鼓勵", "希望", "祝福", "感謝", "思念", "平安", "康復", "健康", "加油"];
  const found = moodHits.filter((k) => text.includes(k));
  if (/謝謝|谢谢|感恩|多謝/.test(text) && !found.includes("感謝")) {
    found.push("感謝");
  }
  if (found.length > 0) return [...new Set(found)].join("、").slice(0, 80);
  return undefined;
}

export function parseStoryWithRules(story: string): ParsedStoryFields {
  const t = story.trim();
  if (!t) return {};

  const out: ParsedStoryFields = {
    recipient: parseRecipient(t),
    occasion: pickByKeywordsLongest(t, OCCASION_KEYWORDS),
    mood: pickByKeywordsLongest(t, MOOD_KEYWORDS),
    budget: parseBudget(t),
    color: parseColor(t),
    flowerMeaning: parseFlowerMeaning(t),
  };

  if (!out.flowerMeaning) delete out.flowerMeaning;
  return out;
}

const EMPTY_OPTIONAL_STRINGS = new Set([
  "null",
  "none",
  "無",
  "不限",
  "未知",
  "不明",
  "n/a",
  "na",
  "沒有",
  "无",
]);

function isPresentOptionalString(value?: string | null): value is string {
  if (!value?.trim()) return false;
  return !EMPTY_OPTIONAL_STRINGS.has(value.trim().toLowerCase());
}

const FLOWER_MEANING_STORY_ALIASES: Record<string, string[]> = {
  感謝: ["謝謝", "谢谢", "感恩", "多謝"],
};

function flowerMeaningInStory(story: string, flowerMeaning: string): boolean {
  const t = story.trim();
  if (!t) return false;
  const parts = flowerMeaning
    .split(/[,，、\s]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  if (parts.length === 0) return false;
  return parts.some((p) => {
    if (t.includes(p)) return true;
    const aliases = FLOWER_MEANING_STORY_ALIASES[p];
    return aliases?.some((a) => t.includes(a)) ?? false;
  });
}

function recipientInStory(story: string, recipient: string): boolean {
  const t = story.trim();
  const r = recipient.trim();
  if (!r || r.length < 2) return false;
  const best = longestRecipientInText(t);
  if (best) return best === r;
  return t.includes(r);
}

function enumFieldInStory(
  story: string,
  value: string,
  keywordMap: Record<string, string[]>
): boolean {
  const keys = keywordMap[value];
  if (!keys?.length) return false;
  return keys.some((k) => story.includes(k));
}

function mergeEnumField(
  story: string,
  current: string | undefined,
  fromRules: string | undefined,
  keywordMap: Record<string, string[]>
): string | undefined {
  // Trust the LLM's output if available, otherwise fall back to rules
  return current?.trim() || fromRules;
}

/**
 * Trust the LLM-extracted fields (mood, flowerMeaning, recipient, occasion)
 * and only fall back to rule-based parsing when LLM outputs are empty.
 */
export function coerceFieldsFromStory(
  story: string,
  fields: ParsedStoryFields
): ParsedStoryFields {
  const t = story.trim();
  const fromRules = parseStoryWithRules(t);
  const out: ParsedStoryFields = { ...fields };

  if (fromRules.budget !== undefined) {
    out.budget = fromRules.budget;
  } else {
    delete out.budget;
  }

  if (fromRules.color) {
    out.color = fromRules.color;
  } else {
    delete out.color;
  }

  // Trust the LLM's flowerMeaning if present, otherwise use rule-based parsing
  if (!out.flowerMeaning?.trim()) {
    out.flowerMeaning = fromRules.flowerMeaning;
  }

  // Trust the LLM's recipient if present, otherwise use rule-based parsing
  if (!out.recipient?.trim()) {
    out.recipient = fromRules.recipient;
  }

  out.occasion = mergeEnumField(t, out.occasion, fromRules.occasion, OCCASION_KEYWORDS);
  out.mood = mergeEnumField(t, out.mood, fromRules.mood, MOOD_KEYWORDS);

  return out;
}

export function sanitizeParsedFields(
  raw: Partial<ParsedStoryFields>
): ParsedStoryFields {
  const out: ParsedStoryFields = {};
  if (isPresentOptionalString(raw.recipient)) {
    out.recipient = raw.recipient!.trim().slice(0, 40);
  }
  if (raw.occasion && OCCASION_OPTIONS.includes(raw.occasion as (typeof OCCASION_OPTIONS)[number])) {
    out.occasion = raw.occasion;
  }
  if (raw.mood?.trim()) {
    const moodParts = splitTagField(raw.mood).filter((p) =>
      MOOD_OPTIONS.includes(p as (typeof MOOD_OPTIONS)[number])
    );
    if (moodParts.length > 0) {
      out.mood = moodParts.join("、");
    }
  }
  if (typeof raw.budget === "number" && Number.isFinite(raw.budget) && raw.budget > 0) {
    out.budget = Math.round(raw.budget);
  }
  if (isPresentOptionalString(raw.color)) {
    out.color = raw.color!.trim().slice(0, 12);
  }
  if (isPresentOptionalString(raw.flowerMeaning)) {
    out.flowerMeaning = raw.flowerMeaning!.trim().slice(0, 80);
  }
  return out;
}
