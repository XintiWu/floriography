/**
 * 語意搜尋 vs 字串比對 A/B 對照測試
 * 評估兩種粗排方法在相同情境下的差異與互補性
 *
 * 執行（不需要 dev server）：
 *   export $(cat .env | grep -v '^#' | xargs) && npx tsx scripts/test-semantic-vs-string.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getFlowerCatalog,
  scoreCatalogLocally,
  scoreCatalogWithEmbedding,
} from "../src/lib/flowerRecommend.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Load .env
function loadEnv() {
  try {
    const raw = readFileSync(join(ROOT, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch { /* ignore */ }
}

const DIM = (s: string) => `\x1b[2m${s}\x1b[0m`;
const B = (s: string) => `\x1b[34m${s}\x1b[0m`;
const G = (s: string) => `\x1b[32m${s}\x1b[0m`;
const Y = (s: string) => `\x1b[33m${s}\x1b[0m`;

// ─── 測試案例 ─────────────────────────────────────────────────────────────────
type ABCase = {
  id: string;
  label: string;
  input: {
    story?: string;
    recipient?: string;
    occasion?: string;
    mood?: string;
    color?: string;
    flowerMeaning?: string;
    budget?: number;
  };
  // 期望 embedding 能找到而字串比對不一定能找到的情境
  semanticEdge?: string;
};

const CASES: ABCase[] = [
  {
    id: "A01",
    label: "媽媽生日（結構化欄位）",
    input: { recipient: "媽媽", occasion: "生日", mood: "祝福", budget: 80 },
  },
  {
    id: "A02",
    label: "失戀慰藉（純自由文字）",
    input: { story: "我的朋友最近失戀了，心情很低落，想送花給他打氣，讓他感受到被支持" },
    semanticEdge: "「失戀」「低落」語意→思念/祝福情緒花卡",
  },
  {
    id: "A03",
    label: "同義詞：伴侶紀念日",
    input: { story: "想送給我的伴侶一個驚喜，今天是我們在一起三年的紀念日" },
    semanticEdge: "「伴侶」≈「戀人/老婆」應命中愛情類",
  },
  {
    id: "A04",
    label: "同義詞：療養/復原",
    input: { story: "好友前幾天動了手術，現在在家裡休養，想送個有「復原」「生命力」意象的花" },
    semanticEdge: "「復原」≈「康復」/「生命力」≈傷病情境",
  },
  {
    id: "A05",
    label: "感謝老師（隱含場合）",
    input: { story: "學期快結束了，想謝謝班導師整年的照顧，希望花語帶感謝意涵" },
    semanticEdge: "「班導師」未必直接命中字串，語意應能理解為「老師」",
  },
  {
    id: "A06",
    label: "預算過濾 + 語意",
    input: {
      story: "送給男友一個驚喜，預算50元以內，希望有愛情、紀念日的感覺",
      budget: 50,
    },
    semanticEdge: "語意找到愛情類，同時預算過濾",
  },
  {
    id: "A07",
    label: "色系偏好（粉色）",
    input: { occasion: "畢業", mood: "祝福", color: "粉", budget: 100 },
  },
  {
    id: "A08",
    label: "抽象情境（上司升遷）",
    input: { story: "公司有位前輩剛剛升職了，想送一個祝賀的花，不要太親密，要有格調" },
    semanticEdge: "「升職」「格調」語意→祝賀/繁榮意象",
  },
  {
    id: "A09",
    label: "混合中英文（現代用語）",
    input: { story: "送給好友一個 surprise，她最近 super stressed 但終於通過考試了，很開心" },
    semanticEdge: "中英混合應能理解情境（考試/鼓勵）",
  },
  {
    id: "A10",
    label: "花語關鍵字精確比對",
    input: { flowerMeaning: "永恆的愛", occasion: "紀念日" },
  },
];

// ─── 計算 top-K 的花材與情緒分布 ─────────────────────────────────────────────
function summarizeTopK(ranked: Array<{ card: { tags: { flowers: string[]; moods: string[] }; title: string; priceTwd: number }; score: number }>, k = 5) {
  const top = ranked.slice(0, k);
  const moods = [...new Set(top.flatMap((r) => r.card.tags.moods))];
  const flowers = [...new Set(top.flatMap((r) => r.card.tags.flowers))].slice(0, 6);
  const priceRange = `NT$${Math.min(...top.map((r) => r.card.priceTwd))}~${Math.max(...top.map((r) => r.card.priceTwd))}`;
  const titles = top.map((r) => `${r.card.title.slice(0, 20)}（${r.score}%）`);
  return { moods, flowers, priceRange, titles };
}

// ─── Overlap 計算 ─────────────────────────────────────────────────────────────
function topKOverlap(a: Array<{ card: { id: string } }>, b: Array<{ card: { id: string } }>, k = 5): number {
  const setA = new Set(a.slice(0, k).map((r) => r.card.id));
  const setB = new Set(b.slice(0, k).map((r) => r.card.id));
  let common = 0;
  for (const id of setA) if (setB.has(id)) common++;
  return common / k;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  loadEnv();

  const hasKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  console.log(B("═══════════════════════════════════════════════════════════════"));
  console.log(B("  語意搜尋 vs 字串比對 A/B 對照測試"));
  console.log(B(`  時間：${new Date().toLocaleString("zh-TW")}`));
  console.log(B("═══════════════════════════════════════════════════════════════"));
  console.log(`\nGEMINI_API_KEY：${hasKey ? G("已設定（完整模式）") : Y("未設定（只跑字串比對）")}\n`);

  const data = await getFlowerCatalog();
  const hasEmbeddings = data.cards.some((c) => (c as { embedding?: number[] }).embedding?.length);
  console.log(`Catalog：${data.cards.length} 張花卡，embedding：${hasEmbeddings ? G("✓") : Y("✗（僅字串模式）")}\n`);

  const rows: string[] = [];
  const overlapScores: number[] = [];
  let semanticWins = 0;

  for (const c of CASES) {
    console.log(`[${c.id}] ${c.label}…`);

    // 字串比對
    const t0 = Date.now();
    const stringRanked = scoreCatalogLocally(c.input, data);
    const stringMs = Date.now() - t0;
    const stringSummary = summarizeTopK(stringRanked);

    // Embedding 比對（async）
    let embedRanked = stringRanked; // default fallback
    let embedMs = 0;
    let embedNote = "（fallback 到字串比對）";

    if (hasKey && hasEmbeddings) {
      const t1 = Date.now();
      embedRanked = await scoreCatalogWithEmbedding(c.input, data);
      embedMs = Date.now() - t1;
      embedNote = `（${embedMs}ms）`;
    }

    const embedSummary = summarizeTopK(embedRanked);
    const overlap = topKOverlap(stringRanked, embedRanked);
    overlapScores.push(overlap);

    // 比較哪個更好（粗略：看情緒多樣性）
    const embedMoodRicher = embedSummary.moods.length > stringSummary.moods.length;
    if (embedMoodRicher) semanticWins++;

    const row = `### ${c.id} — ${c.label}
${c.semanticEdge ? `> 語意邊際案例：${c.semanticEdge}\n` : ""}
**輸入**：\`${JSON.stringify(c.input).slice(0, 120)}\`

#### 字串比對（${stringMs}ms）
| 項目 | 值 |
|------|---|
| Top-5 情緒 | ${stringSummary.moods.join("、") || "—"} |
| Top-5 花材 | ${stringSummary.flowers.join("、") || "—"} |
| 價格區間 | ${stringSummary.priceRange} |
| 推薦卡 | ${stringSummary.titles.join("<br>") || "—"} |

#### Embedding 語意比對 ${embedNote}
| 項目 | 值 |
|------|---|
| Top-5 情緒 | ${embedSummary.moods.join("、") || "—"} |
| Top-5 花材 | ${embedSummary.flowers.join("、") || "—"} |
| 價格區間 | ${embedSummary.priceRange} |
| 推薦卡 | ${embedSummary.titles.join("<br>") || "—"} |

**Top-5 重疊率**：${(overlap * 100).toFixed(0)}%（${Math.round(overlap * 5)}/5 張相同）

---`;

    rows.push(row);

    // Rate limit 保護
    if (hasKey) await new Promise((r) => setTimeout(r, 500));
  }

  const avgOverlap = overlapScores.reduce((a, b) => a + b, 0) / overlapScores.length;

  const report = `# 語意搜尋 vs 字串比對 A/B 報告

**產生時間**：${new Date().toISOString()}  
**模式**：${hasKey && hasEmbeddings ? "完整（Embedding + 字串）" : "字串比對（無 API key 或 catalog 無向量）"}

## 摘要

| 指標 | 值 |
|------|---|
| 測試案例數 | ${CASES.length} |
| Top-5 平均重疊率 | ${(avgOverlap * 100).toFixed(1)}%（兩方法選到相同花卡的比例） |
| Embedding 情緒更豐富 | ${semanticWins} / ${CASES.length} 案例 |

> **解讀**：重疊率越低 → 兩種方法差異越大，Embedding 帶來了新的多樣性。  
> 重疊率越高 → 在此 catalog 規模下兩方法結果相似。

## 逐案結果

${rows.join("\n")}
`;

  const outPath = join(ROOT, "docs", "semantic-vs-string-report.md");
  writeFileSync(outPath, report, "utf8");
  console.log(`\n${G("✓")} 報告已寫入：${outPath}`);
  console.log(`Top-5 平均重疊率：${(avgOverlap * 100).toFixed(1)}%`);
  console.log(`Embedding 情緒更豐富：${semanticWins}/${CASES.length} 案例`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
