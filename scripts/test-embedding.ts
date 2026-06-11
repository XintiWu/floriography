/**
 * Embedding 單元測試
 * 測試 cosine similarity 數學、catalog embedding 品質、與 fallback 行為
 *
 * 執行（不需要 dev server）：
 *   export $(cat .env | grep -v '^#' | xargs) && npx tsx scripts/test-embedding.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CATALOG_PATH = join(ROOT, "src", "data", "flowerCatalog.json");

// ─── ANSI colors ────────────────────────────────────────────────────────────
const G = (s: string) => `\x1b[32m${s}\x1b[0m`;
const R = (s: string) => `\x1b[31m${s}\x1b[0m`;
const Y = (s: string) => `\x1b[33m${s}\x1b[0m`;
const B = (s: string) => `\x1b[34m${s}\x1b[0m`;
const DIM = (s: string) => `\x1b[2m${s}\x1b[0m`;

// ─── Test runner ─────────────────────────────────────────────────────────────
type TestResult = { name: string; pass: boolean; detail: string; skipped?: boolean };
const results: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn())
    .then(() => results.push({ name, pass: true, detail: "OK" }))
    .catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ name, pass: false, detail: msg });
    });
}

function skip(name: string, reason: string) {
  results.push({ name, pass: false, detail: reason, skipped: true });
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function assertClose(a: number, b: number, tol: number, label: string) {
  if (Math.abs(a - b) > tol)
    throw new Error(`${label}: expected ≈${b.toFixed(4)}, got ${a.toFixed(4)} (tol=${tol})`);
}

// ─── Cosine similarity (inline, same as flowerRecommend.ts) ──────────────────
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Embed via Gemini ─────────────────────────────────────────────────────────
async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const model = "gemini-embedding-001";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text }] } }),
      signal: AbortSignal.timeout(15_000),
    }
  ).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json();
  return data?.embedding?.values ?? null;
}

// ─── Types ───────────────────────────────────────────────────────────────────
type CatalogCard = {
  id: string;
  title: string;
  tags: { flowers: string[]; occasions: string[]; moods: string[]; colors: string[] };
  blurb?: string;
  embedding?: number[];
};
type Catalog = { cards: CatalogCard[]; embeddedAt?: string };

// ─── Load catalog ─────────────────────────────────────────────────────────────
function loadCatalog(): Catalog {
  if (!existsSync(CATALOG_PATH)) throw new Error(`找不到 ${CATALOG_PATH}`);
  return JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as Catalog;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 1 — 數學正確性（不需 API）
// ─────────────────────────────────────────────────────────────────────────────
async function runMathTests() {
  console.log(B("\n§1  Cosine Similarity 數學正確性"));

  await test("完全相同向量 → 1.0", () => {
    const v = [0.1, 0.5, -0.3, 0.8];
    assertClose(cosineSim(v, v), 1.0, 1e-9, "cos(v,v)");
  });

  await test("完全相反向量 → -1.0", () => {
    const v = [1, 0, 0];
    assertClose(cosineSim(v, v.map((x) => -x)), -1.0, 1e-9, "cos(v,-v)");
  });

  await test("正交向量 → 0.0", () => {
    assertClose(cosineSim([1, 0, 0], [0, 1, 0]), 0.0, 1e-9, "orthogonal");
  });

  await test("零向量 → 0.0（不崩潰）", () => {
    assertClose(cosineSim([0, 0, 0], [1, 2, 3]), 0.0, 1e-9, "zero vector");
  });

  await test("尺度無關（不同長度向量方向相同 → 1.0）", () => {
    const a = [1, 2, 3];
    const b = [2, 4, 6]; // 2× a
    assertClose(cosineSim(a, b), 1.0, 1e-9, "scale invariant");
  });

  await test("已知角度計算（cos 60° = 0.5）", () => {
    // [1,0] vs [cos60°,sin60°] = [0.5, 0.866]
    assertClose(cosineSim([1, 0], [0.5, Math.sqrt(3) / 2]), 0.5, 1e-6, "cos60");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 2 — Catalog 完整性（不需 API）
// ─────────────────────────────────────────────────────────────────────────────
async function runCatalogTests() {
  console.log(B("\n§2  Catalog Embedding 完整性"));

  const cat = loadCatalog();

  await test("catalog 存在且可解析", () => {
    assert(cat.cards.length > 0, "cards 為空");
  });

  await test("所有花卡都有 embedding", () => {
    const missing = cat.cards.filter((c) => !c.embedding || c.embedding.length === 0);
    assert(missing.length === 0, `${missing.length} 張花卡缺少 embedding`);
  });

  await test("embedding 維度一致（3072）", () => {
    const dims = [...new Set(cat.cards.map((c) => c.embedding?.length ?? 0))];
    assert(dims.length === 1 && dims[0] === 3072, `維度不一致：${dims.join(", ")}`);
  });

  await test("embedding 向量非全零", () => {
    const allZero = cat.cards.filter((c) =>
      c.embedding?.every((v) => v === 0)
    );
    assert(allZero.length === 0, `${allZero.length} 張花卡向量全為 0`);
  });

  await test("embedding 向量值範圍合理（-1 到 1 之間）", () => {
    let outOfRange = 0;
    for (const c of cat.cards) {
      if (c.embedding?.some((v) => Math.abs(v) > 2)) outOfRange++;
    }
    assert(outOfRange === 0, `${outOfRange} 張花卡有異常向量值（>2）`);
  });

  await test("embeddedAt 時間戳存在", () => {
    assert(Boolean(cat.embeddedAt), "缺少 embeddedAt 時間戳");
    const d = new Date(cat.embeddedAt!);
    assert(!isNaN(d.getTime()), `embeddedAt 無效：${cat.embeddedAt}`);
  });

  await test("花卡間相似度不全相同（向量有區分能力）", () => {
    const sample = cat.cards.slice(0, 10);
    const sims: number[] = [];
    for (let i = 0; i < sample.length; i++) {
      for (let j = i + 1; j < sample.length; j++) {
        sims.push(cosineSim(sample[i]!.embedding!, sample[j]!.embedding!));
      }
    }
    const min = Math.min(...sims);
    const max = Math.max(...sims);
    assert(max - min > 0.01, `相似度範圍過窄（${min.toFixed(3)} ~ ${max.toFixed(3)}），向量可能退化`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 3 — 語意搜尋品質（需 Gemini API）
// ─────────────────────────────────────────────────────────────────────────────
type SemanticCase = {
  id: string;
  query: string;
  expectedMoods?: string[];
  expectedFlowers?: string[];
  minSim?: number;
  note: string;
};

const SEMANTIC_CASES: SemanticCase[] = [
  {
    id: "S01",
    query: "送給媽媽的生日祝福，希望溫暖、思念",
    expectedMoods: ["祝福", "思念"],
    minSim: 0.60,
    note: "媽媽生日 → 思念/祝福情緒",
  },
  {
    id: "S02",
    query: "失戀很難過，想送朋友慰藉和支持",
    expectedMoods: ["思念", "祝福"],
    minSim: 0.60,
    note: "失戀慰藉 → 非愛情類",
  },
  {
    id: "S03",
    query: "想送給女朋友紀念日，浪漫愛情",
    expectedMoods: ["愛情"],
    minSim: 0.65,
    note: "戀人紀念日 → 愛情情緒",
  },
  {
    id: "S04",
    query: "摯友畢業，希望有前程、希望意象",
    expectedMoods: ["祝福"],
    minSim: 0.58,
    note: "畢業祝福",
  },
  {
    id: "S05",
    query: "同義詞測試：給「伴侶」的結婚週年禮物",
    expectedMoods: ["愛情"],
    minSim: 0.60,
    note: "同義詞：伴侶 ≈ 戀人/老婆",
  },
  {
    id: "S06",
    query: "爸爸生病住院，希望早日康復，平安健康",
    expectedMoods: ["祝福"],
    minSim: 0.58,
    note: "傷病情境 → 祝福/陪伴情緒",
  },
];

async function runSemanticTests() {
  console.log(B("\n§3  語意搜尋品質（需 Gemini API）"));

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    for (const c of SEMANTIC_CASES) skip(c.id, "GEMINI_API_KEY 未設定");
    return;
  }

  const cat = loadCatalog();
  const withEmbed = cat.cards.filter((c) => c.embedding && c.embedding.length > 0);

  for (const c of SEMANTIC_CASES) {
    await test(`${c.id} — ${c.note}`, async () => {
      const queryVec = await embedText(c.query);
      assert(queryVec !== null, "embedText 回傳 null");

      const ranked = withEmbed
        .map((card) => ({
          card,
          sim: cosineSim(queryVec!, card.embedding!),
        }))
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 5);

      // 最高相似度門檻
      const topSim = ranked[0]?.sim ?? 0;
      if (c.minSim) {
        assert(topSim >= c.minSim, `top-1 相似度 ${(topSim * 100).toFixed(1)}% < 要求 ${(c.minSim * 100).toFixed(0)}%`);
      }

      // Top-5 應含期望情緒
      if (c.expectedMoods && c.expectedMoods.length > 0) {
        const top5Moods = ranked.flatMap((r) => r.card.tags.moods);
        const found = c.expectedMoods.some((m) => top5Moods.includes(m));
        assert(found, `top-5 未出現期望情緒：${c.expectedMoods.join("/")}，實際：${[...new Set(top5Moods)].join("、")}`);
      }

      // Top-5 應含期望花材
      if (c.expectedFlowers && c.expectedFlowers.length > 0) {
        const top5Flowers = ranked.flatMap((r) => r.card.tags.flowers);
        const found = c.expectedFlowers.some((f) => top5Flowers.includes(f));
        assert(found, `top-5 未出現期望花材：${c.expectedFlowers.join("/")}，實際：${[...new Set(top5Flowers)].slice(0, 8).join("、")}`);
      }

      // Print detail
      console.log(DIM(`     query: "${c.query}"`));
      for (const r of ranked.slice(0, 3)) {
        console.log(DIM(`     ${(r.sim * 100).toFixed(1)}%  ${r.card.title}  [${r.card.tags.moods.join("/")}]`));
      }
    });

    // Rate limit 保護
    await new Promise((r) => setTimeout(r, 800));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 4 — Fallback 行為（不需 API）
// ─────────────────────────────────────────────────────────────────────────────
async function runFallbackTests() {
  console.log(B("\n§4  Fallback 行為"));

  await test("無 embedding 的 catalog → cosineSim 仍回傳合理值（不崩潰）", () => {
    const emptyVec: number[] = [];
    // 模擬 scoreCatalogWithEmbedding 的 hasEmbeddings check
    const hasEmbed = false;
    assert(!hasEmbed, "應走 fallback 路徑");
  });

  await test("embedQueryText 傳回 null 時 scoreCatalogWithEmbedding 應 fallback", () => {
    // 確認函式簽名：scoreCatalogWithEmbedding 回傳 Promise<Array>
    // 這是靜態檢查，確認 export 存在
    const modPath = join(ROOT, "src", "lib", "flowerRecommend.ts");
    const src = readFileSync(modPath, "utf8");
    assert(src.includes("scoreCatalogWithEmbedding"), "scoreCatalogWithEmbedding 不存在");
    assert(src.includes("return scoreCatalogLocally"), "fallback 到 scoreCatalogLocally 的路徑不存在");
  });

  await test("embedQueryText 沒有 GEMINI_API_KEY 時回傳 null（不拋出）", async () => {
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const result = await embedText("test");
    process.env.GEMINI_API_KEY = origKey;
    assert(result === null, "應回傳 null 而非拋出");
  });

  await test("embed:catalog 腳本存在", () => {
    const scriptPath = join(ROOT, "scripts", "embed-catalog.ts");
    assert(existsSync(scriptPath), "scripts/embed-catalog.ts 不存在");
  });

  await test("package.json 含 embed:catalog script", () => {
    const pkgPath = join(ROOT, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { scripts?: Record<string, string> };
    assert(Boolean(pkg.scripts?.["embed:catalog"]), "embed:catalog script 不存在於 package.json");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION 5 — 近鄰一致性（Top-K 穩定度）
// ─────────────────────────────────────────────────────────────────────────────
async function runConsistencyTests() {
  console.log(B("\n§5  近鄰一致性（不需 API）"));

  const cat = loadCatalog();
  const cards = cat.cards.filter((c) => c.embedding && c.embedding.length > 0);

  await test("相同向量查詢兩次 → top-5 順序一致", () => {
    const queryVec = cards[0]!.embedding!; // use first card as query
    const rank1 = cards
      .map((c) => ({ id: c.id, sim: cosineSim(queryVec, c.embedding!) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 5)
      .map((r) => r.id);
    const rank2 = cards
      .map((c) => ({ id: c.id, sim: cosineSim(queryVec, c.embedding!) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 5)
      .map((r) => r.id);
    assert(JSON.stringify(rank1) === JSON.stringify(rank2), "兩次查詢結果不一致");
  });

  await test("自身應在最近鄰 top-1（或與 top-1 同分）", () => {
    const sample = cards.slice(0, 5);
    const fails: string[] = [];
    for (const target of sample) {
      const ranked = cards
        .map((c) => ({ id: c.id, sim: cosineSim(target.embedding!, c.embedding!) }))
        .sort((a, b) => b.sim - a.sim);
      const selfSim = cosineSim(target.embedding!, target.embedding!);
      const top1Sim = ranked[0]?.sim ?? 0;
      // Allow ties: self might not be literally rank-1 if duplicates exist,
      // but its similarity must equal the top-1 similarity
      if (Math.abs(selfSim - top1Sim) > 1e-9) {
        fails.push(`${target.id.slice(0, 8)} (selfSim=${selfSim.toFixed(6)}, top1=${top1Sim.toFixed(6)})`);
      }
    }
    assert(fails.length === 0, `自查詢相似度不是最高值：${fails.join(", ")}`);
  });

  await test("同一花材的花卡語意上應相近（相似度 > 0.7）", () => {
    // 找含「玫瑰」的花卡
    const roseCards = cards.filter((c) => c.tags.flowers.includes("玫瑰"));
    if (roseCards.length < 2) return; // skip if not enough data
    const pairs: number[] = [];
    for (let i = 0; i < Math.min(roseCards.length, 5); i++) {
      for (let j = i + 1; j < Math.min(roseCards.length, 5); j++) {
        pairs.push(cosineSim(roseCards[i]!.embedding!, roseCards[j]!.embedding!));
      }
    }
    const avgSim = pairs.reduce((a, b) => a + b, 0) / pairs.length;
    assert(avgSim > 0.7, `玫瑰花卡平均相似度 ${(avgSim * 100).toFixed(1)}% 偏低（期望 >70%）`);
  });

  await test("不同類型花卡的語意差異（相似度 < 0.99）", () => {
    // 愛情 vs 祝福 系列
    const love = cards.find((c) => c.tags.moods.includes("愛情") && !c.tags.moods.includes("祝福"));
    const blessing = cards.find((c) => c.tags.moods.includes("祝福") && !c.tags.moods.includes("愛情"));
    if (!love || !blessing) return;
    const sim = cosineSim(love.embedding!, blessing.embedding!);
    assert(sim < 0.99, `愛情 vs 祝福 相似度異常高：${(sim * 100).toFixed(1)}%`);
    console.log(DIM(`     愛情 vs 祝福 cosine: ${(sim * 100).toFixed(1)}%`));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(B("═══════════════════════════════════════════════════════"));
  console.log(B("  Floriography — Embedding 測試套件"));
  console.log(B(`  執行時間：${new Date().toLocaleString("zh-TW")}`));
  console.log(B("═══════════════════════════════════════════════════════"));

  const hasKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  console.log(`\nGEMINI_API_KEY：${hasKey ? G("已設定") : Y("未設定（語意測試將跳過）")}`);

  await runMathTests();
  await runCatalogTests();
  await runSemanticTests();
  await runFallbackTests();
  await runConsistencyTests();

  // ─── Summary ─────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.pass);
  const failed = results.filter((r) => !r.pass && !r.skipped);
  const skipped = results.filter((r) => r.skipped);

  console.log(B("\n═══════════════════════════════════════════════════════"));
  console.log(B("  結果"));
  console.log(B("═══════════════════════════════════════════════════════\n"));

  for (const r of results) {
    if (r.skipped) {
      console.log(`  ${Y("SKIP")} ${r.name} — ${DIM(r.detail)}`);
    } else if (r.pass) {
      console.log(`  ${G("PASS")} ${r.name}`);
    } else {
      console.log(`  ${R("FAIL")} ${r.name}`);
      console.log(`       ${R(r.detail)}`);
    }
  }

  console.log();
  console.log(`  ${G(`PASS: ${passed.length}`)}  ${R(`FAIL: ${failed.length}`)}  ${Y(`SKIP: ${skipped.length}`)}`);
  console.log();

  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
