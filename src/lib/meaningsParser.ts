/**
 * Parse meanings.md: each `## **title**` block maps to body text until the next `##` or EOF.
 * Primary flower key strips parenthetical English (e.g. 玫瑰（Rose）→ 玫瑰).
 */

const CRYSTAL_FALLBACK =
  "水晶花質感清透，常象徵純淨、真誠與簡約的祝福，適合搭配乾燥花與不凋花材，傳遞細膩心意。";

export type MeaningsMap = Record<string, string>;

function primaryNameFromHeading(inner: string): string {
  const trimmed = inner.replace(/\*\*/g, "").trim();
  const idx = trimmed.indexOf("（");
  if (idx > 0) return trimmed.slice(0, idx).trim();
  const idx2 = trimmed.indexOf("(");
  if (idx2 > 0) return trimmed.slice(0, idx2).trim();
  const beforeSpace = trimmed.split(/\s+/)[0]?.trim() ?? trimmed;
  return beforeSpace || trimmed;
}

/**
 * Extract `## **...**` sections. Skips page headers `# **第n頁` only at line start.
 */
export function parseMeaningsMd(raw: string): MeaningsMap {
  const map: MeaningsMap = {};
  const lines = raw.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^##\s+\*\*(.+)$/);
    if (m) {
      const rest = m[1];
      const closeIdx = rest.indexOf("**");
      const inner = closeIdx >= 0 ? rest.slice(0, closeIdx) : rest.replace(/\*+$/, "");
      const key = primaryNameFromHeading(inner);
      i += 1;
      const body: string[] = [];
      while (i < lines.length && !/^##\s+/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      const text = body.join("\n").trim();
      if (key && text.length > 0) {
        map[key] = text;
      }
      continue;
    }
    i += 1;
  }
  if (!map["水晶花"]) {
    map["水晶花"] = CRYSTAL_FALLBACK;
  }
  return map;
}
