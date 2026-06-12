/**
 * Add Gemini embeddings to an existing flowerCatalog.json
 * Run: npx tsx scripts/embed-catalog.ts
 *
 * This is safe to re-run: it skips cards that already have embeddings.
 * Use --force to re-embed everything.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { embedBatch } from "./lib/geminiEmbed.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CATALOG_PATH = join(ROOT, "src", "data", "flowerCatalog.json");
const FORCE = process.argv.includes("--force");

type CatalogCard = {
  id: string;
  tags: { flowers: string[]; occasions: string[]; moods: string[]; colors: string[] };
  blurb?: string;
  embedding?: number[];
  [k: string]: unknown;
};

type Catalog = {
  cards: CatalogCard[];
  dictionary: string[];
  builtAt?: string;
  [k: string]: unknown;
};

async function main() {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error("GEMINI_API_KEY is not set. Please set it in .env and re-run.");
    process.exit(1);
  }

  if (!existsSync(CATALOG_PATH)) {
    console.error(`Not found: ${CATALOG_PATH}`);
    process.exit(1);
  }

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as Catalog;
  const { cards } = catalog;

  const toEmbed = FORCE
    ? cards
    : cards.filter((c) => !c.embedding || c.embedding.length === 0);

  if (toEmbed.length === 0) {
    console.log(`All ${cards.length} cards already have embeddings. Use --force to re-embed.`);
    return;
  }

  console.log(
    `Embedding ${toEmbed.length} / ${cards.length} cards (${FORCE ? "--force" : "missing only"})…`
  );

  const texts = toEmbed.map((c) =>
    [
      c.tags.flowers.join("、"),
      c.tags.occasions.join("、"),
      c.tags.moods.join("、"),
      c.tags.colors.join("、"),
      c.blurb ?? "",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 1500)
  );

  const BATCH = 100;
  let done = 0;

  for (let i = 0; i < texts.length; i += BATCH) {
    const chunkTexts = texts.slice(i, i + BATCH);
    const chunkCards = toEmbed.slice(i, i + BATCH);
    const vectors = await embedBatch(chunkTexts);
    for (let j = 0; j < chunkCards.length; j++) {
      chunkCards[j]!.embedding = vectors[j];
    }
    done += chunkCards.length;
    console.log(`  ${done} / ${toEmbed.length} embedded…`);
  }

  writeFileSync(
    CATALOG_PATH,
    JSON.stringify({ ...catalog, cards, embeddedAt: new Date().toISOString() }, null, 0),
    "utf8"
  );

  const dims = toEmbed[0]?.embedding?.length ?? 0;
  console.log(
    `Done. ${toEmbed.length} embeddings written (${dims} dims) → ${CATALOG_PATH}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
