/**
 * 十種情境：產出花語顧問解析 + 為何推薦這張
 * 執行：npx tsx scripts/run-consultant-scenarios.ts
 * 需 .env.local 含 GEMINI_API_KEY（或 Ollama）
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  getFlowerCatalog,
  scoreCatalogLocally,
  toPublicCard,
  type CatalogCard,
} from "../src/lib/flowerRecommend";
import {
  analyzeStoryWithOllama,
  type CandidateSummary,
} from "../src/lib/recommendOllama";
import { createRecommendLlm } from "../src/lib/llmProvider";
import { coerceFieldsFromStory } from "../src/lib/parseStoryRules";
import { hasRomanticLeak } from "../src/lib/recommendTone";

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* ignore */
  }
}

const SCENARIOS = [
  { id: "T01", story: "想送給媽媽生日祝福，預算80元", note: "媽媽生日（用戶回報案例）" },
  { id: "T02", story: "想送給受傷的兄弟早日康復的卡片", note: "兄弟康復" },
  { id: "T03", story: "送給即將畢業的摯友，希望粉色、帶鼓勵與希望的花語", note: "摯友畢業" },
  { id: "T04", story: "紀念日和老婆過，香檳色，預算120", note: "配偶紀念日（可有愛情）" },
  { id: "T05", story: "謝謝老師這學期的教導，要溫柔一點", note: "感謝老師" },
  { id: "T06", story: "給女朋友一個驚喜，紀念日想要酒紅色", note: "女友紀念日（可有愛情）" },
  { id: "T07", story: "想送給生病住院的爸爸，祝他早日康復", note: "爸爸住院" },
  { id: "T08", story: "妹妹考上台大，想送鼓勵的花", note: "妹妹升學" },
  { id: "T09", story: "鄰居阿姨幫忙顧狗，想用日常小禮表達感謝", note: "鄰居感謝" },
  { id: "T10", story: "想送給剛升職的上司表示祝賀，預算150", note: "上司升遷" },
];

const LLM_TOP_K = 8;

function summarizeCard(c: CatalogCard): CandidateSummary {
  return {
    id: c.id,
    title: c.title,
    priceTwd: c.priceTwd,
    flowers: c.tags.flowers.slice(0, 4),
    occasions: c.tags.occasions.slice(0, 3),
    moods: c.tags.moods.slice(0, 3),
    colors: c.tags.colors.slice(0, 3),
    blurb: (c.blurb ?? c.description ?? "").slice(0, 200),
  };
}

async function runOne(
  id: string,
  story: string,
  llm: ReturnType<typeof createRecommendLlm>
) {
  const data = await getFlowerCatalog();
  const storyRanked = scoreCatalogLocally({ story }, data);
  const pool = storyRanked.slice(0, LLM_TOP_K);
  const candidates = pool.map(({ card }) => summarizeCard(card));
  const allowed = new Map(pool.map(({ card }) => [card.id, card]));

  const analyzed = await analyzeStoryWithOllama(story, candidates, llm);
  const fields = coerceFieldsFromStory(story, analyzed.fields);

  const recs = analyzed.recommendations.map((item, i) => {
    const card = allowed.get(item.cardId);
    const title = card?.title ?? item.cardId.slice(0, 8);
    const flowers = card?.tags.flowers?.join("、") ?? "—";
    const leak = hasRomanticLeak(item.why) || hasRomanticLeak(analyzed.consultantReply);
    return {
      rank: i + 1,
      title,
      flowers,
      score: item.score,
      why: item.why,
      leak,
    };
  });

  return {
    id,
    story,
    fields,
    consultantReply: analyzed.consultantReply,
    highlightTerms: analyzed.highlightTerms,
    consultantLeak: hasRomanticLeak(analyzed.consultantReply),
    recs,
    engine: llm.getEngineLabel(),
    aiCallCount: analyzed.aiCallCount,
  };
}

async function main() {
  loadEnvLocal();
  const llm = createRecommendLlm();
  await llm.ready();
  console.log(`Engine: ${llm.getEngineLabel()}\n`);

  const rows: string[] = [];
  let leakCount = 0;

  for (const s of SCENARIOS) {
    console.log(`Running ${s.id}…`);
    const r = await runOne(s.id, s.story, llm);
    const anyLeak =
      r.consultantLeak || r.recs.some((x) => x.leak);
    if (anyLeak) leakCount += 1;

    rows.push(`## ${r.id} — ${s.note}

**情境**：${r.story}

**解析欄位**：對象=${r.fields.recipient ?? "—"}；場合=${r.fields.occasion ?? "—"}；情緒=${r.fields.mood ?? "—"}；花語=${r.fields.flowerMeaning ?? "—"}；預算=${r.fields.budget ?? "—"}

### 花語顧問解析
${r.consultantReply}
${r.consultantLeak ? "\n⚠️ **含戀愛用語（應修正）**" : ""}

**高亮花材**：${r.highlightTerms.join("、") || "—"}

### 為何推薦這張（3 張）
${r.recs
  .map(
    (c) =>
      `${c.rank}. **${c.title}**（${c.flowers}）— 契合度 ${c.score}%\n   - 為何推薦：${c.why}${c.leak ? " ⚠️含戀愛用語" : ""}`
  )
  .join("\n\n")}

---
`);
  }

  const md = `# 十種情境 — 花語顧問解析與推薦理由

**產生時間**：${new Date().toISOString()}  
**引擎**：${llm.getEngineLabel()}  
**戀愛用語洩漏**：${leakCount} / ${SCENARIOS.length} 則（家人／朋友／同事情境不應出現愛情、戀愛、情人等）

${rows.join("\n")}
`;

  const out = join(process.cwd(), "docs/consultant-scenario-report.md");
  writeFileSync(out, md, "utf8");
  console.log(`\nWrote ${out}`);
  console.log(`戀愛用語洩漏：${leakCount}/${SCENARIOS.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
