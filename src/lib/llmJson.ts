/** 從 LLM 回傳文字抽出 JSON 物件（含截斷修復與 recommendations 搶救） */
export function extractJsonObject(text: string): unknown {
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const trimmed = stripCodeFences(cleaned);
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    const repaired = tryRepairTruncatedJson(trimmed);
    if (repaired) {
      try {
        return JSON.parse(repaired);
      } catch {
        /* fall through */
      }
    }
    const salvaged = salvagePartialPayload(trimmed);
    if (salvaged) return salvaged;
    throw new Error("invalid_json");
  }
}

function stripCodeFences(text: string): string {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return m ? m[1].trim() : text;
}

function tryRepairTruncatedJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let s = text.slice(start);
  s = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/m, "");
  s = s.replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/m, "");
  s = s.replace(/,\s*\{[^}]*$/m, "");
  const openSq = (s.match(/\[/g) || []).length;
  const closeSq = (s.match(/\]/g) || []).length;
  const openCurly = (s.match(/\{/g) || []).length;
  const closeCurly = (s.match(/\}/g) || []).length;
  for (let i = 0; i < openSq - closeSq; i++) s += "]";
  for (let i = 0; i < openCurly - closeCurly; i++) s += "}";
  return s;
}

/** 從截斷或損壞 JSON 中搶救 recommendations 與常見欄位 */
export function salvagePartialPayload(
  text: string
): Record<string, unknown> | null {
  const recs = salvageRecommendationItems(text);
  const consultant = text.match(
    /"consultantReply"\s*:\s*"((?:[^"\\]|\\.)*)"/
  );
  const recipient = text.match(/"recipient"\s*:\s*"([^"]*)"/);
  const occasion = text.match(/"occasion"\s*:\s*"([^"]*)"/);
  const mood = text.match(/"mood"\s*:\s*"([^"]*)"/);
  const flowerMeaning = text.match(/"flowerMeaning"\s*:\s*"([^"]*)"/);
  const color = text.match(/"color"\s*:\s*"([^"]*)"/);
  const budget = text.match(/"budget"\s*:\s*(\d+|null)/);

  if (
    recs.length === 0 &&
    !consultant &&
    !recipient &&
    !occasion
  ) {
    return null;
  }

  const payload: Record<string, unknown> = {};
  if (recipient) payload.recipient = recipient[1];
  if (occasion) payload.occasion = occasion[1];
  if (mood) payload.mood = mood[1];
  if (flowerMeaning) payload.flowerMeaning = flowerMeaning[1];
  if (color) payload.color = color[1];
  if (budget) {
    payload.budget = budget[1] === "null" ? null : Number(budget[1]);
  }
  if (consultant) payload.consultantReply = consultant[1];
  if (recs.length > 0) payload.recommendations = recs;
  return payload;
}

export function salvageRecommendationItems(
  text: string
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const re =
    /"cardId"\s*:\s*"?(\d+)"?[\s\S]*?(?:"why"|"reason")\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const chunk = text.slice(m.index, m.index + 160);
    const scoreMatch = chunk.match(/"score"\s*:\s*(\d+)/);
    const matchMatch = chunk.match(/"match"\s*:\s*(\d+)/);
    out.push({
      cardId: m[1],
      score: scoreMatch
        ? Number(scoreMatch[1])
        : matchMatch
          ? Number(matchMatch[1])
          : 88,
      why: m[2],
    });
  }
  return out;
}
