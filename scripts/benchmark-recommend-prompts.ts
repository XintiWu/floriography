/**
 * 情境推薦 prompt benchmark
 * 使用：npm run dev 後執行 npx tsx scripts/benchmark-recommend-prompts.ts
 * 指定：npx tsx scripts/benchmark-recommend-prompts.ts --only P1,V1-mom-birthday
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { getPromptFixtures } from "../src/data/recommendPromptFixtures";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const API = `${BASE}/api/recommend`;

function parseOnlyArg(): string[] | undefined {
  const idx = process.argv.indexOf("--only");
  if (idx < 0 || !process.argv[idx + 1]) return undefined;
  return process.argv[idx + 1].split(",").map((s) => s.trim());
}

type ApiOk = {
  fields?: Record<string, unknown>;
  recommendations?: Array<{
    card: { id: string; title: string };
    score: number;
    why: string;
  }>;
  engine?: string;
  aiRecommendationCount?: number;
  error?: string;
  message?: string;
};

async function postRecommend(body: Record<string, unknown>, timeoutMs = 180_000) {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as ApiOk;
    return {
      status: res.status,
      elapsedMs: Date.now() - t0,
      data,
    };
  } catch (e) {
    return {
      status: 0,
      elapsedMs: Date.now() - t0,
      data: { error: "fetch_failed", message: String(e) } as ApiOk,
    };
  } finally {
    clearTimeout(timer);
  }
}

function fmtFields(f?: Record<string, unknown>) {
  if (!f) return "—";
  const keys = [
    "recipient",
    "occasion",
    "mood",
    "budget",
    "color",
    "flowerMeaning",
  ] as const;
  return keys
    .map((k) => `${k}=${f[k] ?? ""}`)
    .filter((s) => !s.endsWith("="))
    .join("; ") || "（空）";
}

function fmtRecs(data: ApiOk) {
  const recs = data.recommendations ?? [];
  return recs
    .map((r, i) => {
      const ai = !r.why.includes("條件比對補充") && !r.why.startsWith("【條件比對】");
      return `${i + 1}. [${ai ? "AI" : "補位"}] ${r.card.title} (${r.score}%) — ${r.why.slice(0, 48)}${r.why.length > 48 ? "…" : ""}`;
    })
    .join("\n");
}

function countAiRecs(data: ApiOk) {
  return (data.recommendations ?? []).filter(
    (r) => !r.why.includes("條件比對補充") && !r.why.startsWith("【條件比對】")
  ).length;
}

async function main() {
  const prompts = getPromptFixtures(parseOnlyArg());
  console.log(`Benchmark @ ${API}`);
  console.log(`Prompts: ${prompts.map((p) => p.id).join(", ")}\n`);

  console.log("Warm-up analyze (P1)…");
  await postRecommend({ mode: "analyze", story: prompts[0]?.story ?? "測試暖機" });

  const rows: string[] = [];
  let p1Fields: Record<string, unknown> | undefined;
  let totalAi3 = 0;
  let totalRuns = 0;

  for (const p of prompts) {
    console.log(`Running ${p.id} analyze…`);
    const r = await postRecommend({ mode: "analyze", story: p.story });
    if (p.id === "P1" && r.status === 200) p1Fields = r.data.fields;
    const aiN = countAiRecs(r.data);
    if (r.status === 200) {
      totalRuns += 1;
      if (aiN >= 3) totalAi3 += 1;
    }

    rows.push(`### ${p.id} — analyze

- **情境**：${p.story}
- **目的**：${p.note}
- **HTTP**：${r.status} | **耗時**：${(r.elapsedMs / 1000).toFixed(1)}s
- **engine**：${r.data.engine ?? r.data.error ?? "—"}
- **API aiRecommendationCount**：${r.data.aiRecommendationCount ?? "—"}
- **實測 AI 卡數**：${aiN} / 3（無「條件比對補充」視為 AI）
- **fields**：${fmtFields(r.data.fields)}
- **推薦**：
${fmtRecs(r.data) || "（無）"}
`);
  }

  if (p1Fields) {
    console.log("Running P1 refine…");
    const refine = await postRecommend({
      mode: "refine",
      story: "想送給媽媽生日祝福，預算80元",
      recipient: p1Fields.recipient as string | undefined,
      occasion: p1Fields.occasion as string | undefined,
      mood: p1Fields.mood as string | undefined,
      budget: p1Fields.budget as number | undefined,
      color: p1Fields.color as string | undefined,
      flowerMeaning: p1Fields.flowerMeaning as string | undefined,
    });
    const aiN = countAiRecs(refine.data);
    rows.push(`### P1 — refine（對照）

- **HTTP**：${refine.status} | **耗時**：${(refine.elapsedMs / 1000).toFixed(1)}s
- **engine**：${refine.data.engine ?? refine.data.error ?? "—"}
- **實測 AI 卡數**：${aiN} / 3
- **推薦**：
${fmtRecs(refine.data) || "（無）"}
`);
  }

  const md = `# 情境推薦 Prompt Benchmark

**產生時間**：${new Date().toISOString()}  
**API**：\`${API}\`  
**說明**：暖機後各 prompt 跑一次 \`mode=analyze\`；候選使用 n 編號（1~8）提升三張 AI 成功率。

## 成功率摘要

- **3 張皆 AI**：${totalAi3} / ${totalRuns} 次 analyze（${totalRuns ? Math.round((totalAi3 / totalRuns) * 100) : 0}%）
- 詳細 prompt 列表：[\`docs/recommend-prompts.md\`](recommend-prompts.md)

## 結果

${rows.join("\n")}

## 解讀備註

- \`analyze\`：單次合併呼叫；若仍不足 3 張 AI 可能自動 **第 2 次** 僅補推薦（engine 含「2次呼叫」）。
- 建議 \`OLLAMA_MODEL=llama3.2:3b\`，\`ollama serve\` 常駐；重複測 P1/V1 可略快（模型已暖機）。
`;

  const outPath = join(process.cwd(), "docs/recommend-benchmark.md");
  writeFileSync(outPath, md, "utf8");
  console.log(`\nWrote ${outPath}`);
  console.log(`3張皆AI: ${totalAi3}/${totalRuns}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
