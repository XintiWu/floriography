/**
 * 情境推薦 prompt benchmark
 * 使用：npm run dev 後執行 npx tsx scripts/benchmark-recommend-prompts.ts
 */
import { writeFileSync } from "fs";
import { join } from "path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const API = `${BASE}/api/recommend`;

const PROMPTS = [
  { id: "P1", story: "想送給媽媽生日祝福，預算80元", note: "對象+場合+預算" },
  { id: "P2", story: "想送花給受傷的兄弟，祝他早日康復", note: "療癒／加油語境" },
  {
    id: "P3",
    story: "送給即將畢業的摯友，希望粉色、帶鼓勵與希望的花語",
    note: "色調+情緒+花語",
  },
  { id: "P4", story: "紀念日和老婆過，香檳色，預算120", note: "紀念日+色調+預算" },
  { id: "P5", story: "謝謝老師這學期的教導，要溫柔一點", note: "對象+情緒" },
  { id: "P6", story: "想送一份特別的禮物", note: "欄位稀疏、測補位" },
] as const;

type ApiOk = {
  fields?: Record<string, unknown>;
  recommendations?: Array<{
    card: { id: string; title: string };
    score: number;
    why: string;
  }>;
  engine?: string;
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
    .map(
      (r, i) =>
        `${i + 1}. ${r.card.title} (${r.score}%) — ${r.why.slice(0, 48)}${r.why.length > 48 ? "…" : ""}`
    )
    .join("\n");
}

function hasSupplement(data: ApiOk) {
  return (data.recommendations ?? []).some((r) =>
    r.why.includes("條件比對補充")
  );
}

async function main() {
  console.log(`Benchmark @ ${API}\n`);

  // 暖機（不計入報告表格）
  console.log("Warm-up analyze…");
  await postRecommend({ mode: "analyze", story: "測試暖機" });

  const rows: string[] = [];
  let p1Fields: Record<string, unknown> | undefined;

  for (const p of PROMPTS) {
    console.log(`Running ${p.id} analyze…`);
    const r = await postRecommend({ mode: "analyze", story: p.story });
    if (p.id === "P1" && r.status === 200) p1Fields = r.data.fields;

    rows.push(`### ${p.id} — analyze

- **情境**：${p.story}
- **目的**：${p.note}
- **HTTP**：${r.status} | **耗時**：${(r.elapsedMs / 1000).toFixed(1)}s
- **engine**：${r.data.engine ?? r.data.error ?? "—"}
- **fields**：${fmtFields(r.data.fields)}
- **補位**：${hasSupplement(r.data) ? "是" : "否"}
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
    rows.push(`### P1 — refine（對照）

- **HTTP**：${refine.status} | **耗時**：${(refine.elapsedMs / 1000).toFixed(1)}s
- **engine**：${refine.data.engine ?? refine.data.error ?? "—"}
- **推薦**：
${fmtRecs(refine.data) || "（無）"}
`);
  }

  const md = `# 情境推薦 Prompt Benchmark

**產生時間**：${new Date().toISOString()}  
**API**：\`${API}\`  
**說明**：暖機後各 prompt 跑一次 \`mode=analyze\`；P1 另跑 \`mode=refine\` 對照速度。

## 結果

${rows.join("\n")}

## 解讀備註

- \`analyze\` 為單次 Ollama（解析+推薦合併）；\`refine\` 為單次推薦。
- 建議 \`OLLAMA_MODEL=llama3.2:3b\`，並保持 \`ollama serve\` 常駐。
- 含「條件比對補充」表示 LLM 回傳不足 3 張，由粗排補位。
`;

  const outPath = join(process.cwd(), "docs/recommend-benchmark.md");
  writeFileSync(outPath, md, "utf8");
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
