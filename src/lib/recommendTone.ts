import type { ParsedStoryFields } from "@/lib/parseStoryRules";

/** 戀人／配偶語境（允許愛情相關用語） */
const ROMANTIC_RE =
  /女朋友|男友|男朋友|老公|老婆|丈夫|妻子|未婚夫|未婚妻|伴侶|戀人|情人(?!節)|另一半|媳婦|女婿/;

/** 家人語境（禁止戀愛用語） */
const FAMILY_RE =
  /媽媽|媽|母亲|母親|父親|爸爸|爸|爺爺|奶奶|外婆|外公|阿公|阿嬤|祖父|祖母|哥哥|姐姐|弟弟|妹妹|兒子|女兒|孫子|孫女|舅舅|阿姨|叔叔|姑姑|家人|親人/;

/** 非戀人社交語境 */
const PLATONIC_RE =
  /朋友|摯友|閨蜜|同事|上司|老師|學生|鄰居|兄弟|姐妹|同學|客戶|長輩/;

const ROMANTIC_LEAK_RE =
  /愛情|戀愛|熱戀|情侶|情人(?!節)|浪漫|戀人|情人草|熱情告白|表白/;

export type RecommendToneContext = {
  romantic: boolean;
  recipientLabel?: string;
  /** 給 LLM 的關係說明一行 */
  relationshipLine: string;
};

export function isRomanticGiftContext(
  story: string,
  fields?: Partial<ParsedStoryFields>
): boolean {
  const recipient = fields?.recipient?.trim() ?? "";
  const meaning = fields?.flowerMeaning?.trim() ?? "";
  const mood = fields?.mood?.trim() ?? "";
  const blob = `${story} ${recipient} ${meaning} ${mood}`;

  if (ROMANTIC_RE.test(blob)) return true;
  if (/情人節/.test(blob) && !FAMILY_RE.test(recipient) && !PLATONIC_RE.test(recipient)) {
    return true;
  }
  if (FAMILY_RE.test(blob) || PLATONIC_RE.test(blob)) return false;
  if (/紀念日/.test(blob) && /老婆|老公|妻|夫|女友|男友/.test(blob)) return true;
  return false;
}

export function resolveRecommendTone(
  story: string,
  fields: ParsedStoryFields
): RecommendToneContext {
  const romantic = isRomanticGiftContext(story, fields);
  const who = fields.recipient?.trim();
  let relationshipLine: string;
  if (romantic) {
    relationshipLine = who
      ? `收禮關係：戀人／配偶（${who}）。可使用愛情、浪漫等語彙。`
      : "收禮關係：戀人／配偶。可使用愛情、浪漫等語彙。";
  } else if (who && FAMILY_RE.test(who)) {
    relationshipLine = `收禮關係：家人（${who}）。禁止愛情、戀愛、情人、浪漫、熱戀、情侶等戀愛用語；請用親情、祝福、感謝、陪伴、溫暖、守護等。`;
  } else if (who) {
    relationshipLine = `收禮關係：${who}（非戀人）。禁止愛情、戀愛、情人、浪漫等戀愛用語；請用祝福、感謝、鼓勵、陪伴等。`;
  } else {
    relationshipLine =
      "收禮關係：未明示戀人。預設避免愛情、戀愛、情人、浪漫等戀愛用語，除非故事明確為情人節送伴侶。";
  }
  return { romantic, recipientLabel: who, relationshipLine };
}

export function hasRomanticLeak(text: string): boolean {
  return ROMANTIC_LEAK_RE.test(text);
}

/** 非戀人語境：將 why / 顧問文案中的戀愛用語改為親情／祝福語彙 */
export function sanitizeNonRomanticCopy(text: string): string {
  let s = text;
  const rules: Array<[RegExp, string]> = [
    [/愛情和感謝/g, "祝福與感謝"],
    [/感謝和愛情/g, "感謝與祝福"],
    [/愛情與感謝/g, "祝福與感謝"],
    [/感謝與愛情/g, "感謝與祝福"],
    [/展現出愛情/g, "傳達溫暖祝福"],
    [/傳達愛情/g, "傳達祝福"],
    [/象徵愛情/g, "象徵溫暖心意"],
    [/寓意愛情/g, "寓意溫暖祝福"],
    [/愛情長存/g, "情意長存"],
    [/永恆的愛(?!與)/g, "長久的情誼"],
    [/戀愛/g, "心意"],
    [/熱戀/g, "溫暖"],
    [/情侶/g, "彼此"],
    [/情人草/g, "卡斯比亞"],
    [/浪漫/g, "溫馨"],
    [/熱情告白/g, "真摯祝福"],
    [/戀人/g, "對方"],
    [/愛情/g, "親情關懷"],
    [/表達愛意/g, "表達心意"],
    [/愛意/g, "溫暖心意"],
    [/植物標本卡/g, "這件作品"],
  ];
  for (const [re, rep] of rules) {
    s = s.replace(re, rep);
  }
  return s.replace(/\s{2,}/g, " ").trim();
}

export function applyRecommendTone(
  text: string,
  tone: RecommendToneContext
): string {
  const t = text.trim();
  if (!t) return t;
  if (tone.romantic) return t;
  return sanitizeNonRomanticCopy(t);
}
