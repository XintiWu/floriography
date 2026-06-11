/**
 * Gemini text-embedding-004 helper
 * Used both at build-time (catalog) and at runtime (query embedding).
 */

const EMBED_MODEL = "gemini-embedding-001";
const EMBED_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`;
const BATCH_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents`;

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
}

/** Embed a single text string → float[] */
export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(`${EMBED_ENDPOINT}?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini embed failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const values: number[] | undefined = data?.embedding?.values;
  if (!values || values.length === 0) throw new Error("Empty embedding response");
  return values;
}

/** Batch embed up to 20 texts at a time with rate-limit retry */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  // Use small chunks to stay within free-tier rate limits
  const CHUNK_SIZE = 20;
  const DELAY_MS = 1200;   // ~50 req/min max on free tier
  const chunks: string[][] = [];
  for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
    chunks.push(texts.slice(i, i + CHUNK_SIZE));
  }
  const results: number[][] = [];
  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci]!;
    if (ci > 0) await delay(DELAY_MS);
    const data = await fetchBatchWithRetry(chunk);
    const embeddings: { values: number[] }[] = data?.embeddings ?? [];
    if (embeddings.length !== chunk.length) {
      throw new Error(`Expected ${chunk.length} embeddings, got ${embeddings.length}`);
    }
    for (const emb of embeddings) {
      results.push(emb.values);
    }
  }
  return results;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchBatchWithRetry(
  chunk: string[],
  retries = 2
): Promise<{ embeddings: { values: number[] }[] }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${BATCH_ENDPOINT}?key=${apiKey()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: chunk.map((text) => ({
          model: `models/${EMBED_MODEL}`,
          content: { parts: [{ text }] },
        })),
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (res.ok) return res.json();
    const body = await res.text().catch(() => "");
    if (res.status === 429 && attempt < retries) {
      const waitSec = attempt === 0 ? 30 : 60;
      console.warn(`  Rate limited (429), waiting ${waitSec}s before retry ${attempt + 1}…`);
      await delay(waitSec * 1000);
      continue;
    }
    throw new Error(`Gemini batch embed failed (${res.status}): ${body.slice(0, 200)}`);
  }
  throw new Error("Batch embed failed after retries");
}

/** Cosine similarity between two equal-length vectors */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
