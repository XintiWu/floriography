/**
 * Import src/data/cards.json → OCI Postgres `designs` table.
 *
 * Prerequisites:
 *   - .env.local with OCI_DB_HOST, OCI_DB_NAME, OCI_DB_USER, OCI_DB_PASSWORD
 *   - Optional: NEXT_PUBLIC_SUPABASE_URL (for preview_url)
 *   - Optional: metadata.csv (download from Supabase Storage: cards/metadata.csv)
 *
 * Usage:
 *   npx tsx scripts/import-cards-to-designs.ts --dry-run
 *   npx tsx scripts/import-cards-to-designs.ts --limit 10
 *   npx tsx scripts/import-cards-to-designs.ts --metadata-csv ./metadata.csv
 *   npx tsx scripts/import-cards-to-designs.ts --fetch-metadata
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import cardsJson from "../src/data/cards.json";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

type CardRow = {
  id: string;
  title: string;
  priceTwd: number;
  images?: string[];
  description?: string;
  blurb?: string;
};

type CardsFile = { cards: CardRow[] };

type DesignInsert = {
  id: string;
  name: string;
  description: string;
  preview_url: string | null;
  total_price: number;
};

function loadEnvLocal(): void {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && c === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function loadMetadataCsv(filePath: string): Map<string, string> {
  const idToFile = new Map<string, string>();
  const text = readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0];
  if (!header?.includes("ID")) {
    throw new Error(`Unexpected CSV header in ${filePath}`);
  }
  const cols = parseCsvLine(header);
  const idIdx = cols.findIndex((c) => c.toLowerCase() === "id");
  const nameIdx = cols.findIndex((c) =>
    c.toLowerCase().includes("original")
  );
  if (idIdx < 0 || nameIdx < 0) {
    throw new Error("CSV must have ID and Original Name columns");
  }

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const id = row[idIdx];
    const fileName = row[nameIdx];
    if (id && fileName) idToFile.set(id, fileName);
  }
  return idToFile;
}

async function fetchMetadataFromStorage(): Promise<Map<string, string>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local for --fetch-metadata"
    );
  }
  const supabase = createClient(url, key);
  const { data, error } = await supabase.storage
    .from("cards")
    .download("metadata.csv");
  if (error || !data) {
    throw new Error(`Failed to download cards/metadata.csv: ${error?.message}`);
  }
  const text = await data.text();
  const tmpPath = join(ROOT, ".metadata-import-tmp.csv");
  const { writeFileSync, unlinkSync } = await import("node:fs");
  writeFileSync(tmpPath, text, "utf8");
  try {
    return loadMetadataCsv(tmpPath);
  } finally {
    unlinkSync(tmpPath);
  }
}

function basenameFromImagePath(imagePath: string): string {
  const parts = imagePath.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || imagePath;
}

function buildStoragePublicUrl(
  supabaseUrl: string,
  bucket: string,
  fileName: string
): string {
  const base = supabaseUrl.replace(/\/$/, "");
  const encoded = fileName
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${base}/storage/v1/object/public/${bucket}/${encoded}`;
}

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const fetchMetadata = argv.includes("--fetch-metadata");
  let limit: number | undefined;
  let metadataCsv: string | undefined;
  let bucket = "cards";

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit" && argv[i + 1]) {
      limit = Number(argv[i + 1]);
    }
    if (argv[i] === "--metadata-csv" && argv[i + 1]) {
      metadataCsv = argv[i + 1];
    }
    if (argv[i] === "--bucket" && argv[i + 1]) {
      bucket = argv[i + 1];
    }
  }

  return { dryRun, fetchMetadata, limit, metadataCsv, bucket };
}

async function main() {
  loadEnvLocal();
  const args = parseArgs(process.argv.slice(2));

  const host = process.env.OCI_DB_HOST;
  const database = process.env.OCI_DB_NAME;
  const user = process.env.OCI_DB_USER;
  const password = process.env.OCI_DB_PASSWORD;
  const port = Number(process.env.OCI_DB_PORT || 5432);

  if (!host || !database || !user) {
    console.error(
      "Missing OCI_DB_* in .env.local (OCI_DB_HOST, OCI_DB_NAME, OCI_DB_USER, OCI_DB_PASSWORD)"
    );
    process.exit(1);
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://qjshekkscvghlzhpkzju.supabase.co";

  let idToFile = new Map<string, string>();
  if (args.metadataCsv) {
    const csvPath = join(process.cwd(), args.metadataCsv);
    if (!existsSync(csvPath)) {
      console.error(`metadata.csv not found: ${csvPath}`);
      process.exit(1);
    }
    idToFile = loadMetadataCsv(csvPath);
    console.log(`Loaded ${idToFile.size} rows from ${csvPath}`);
  } else if (args.fetchMetadata) {
    idToFile = await fetchMetadataFromStorage();
    console.log(`Fetched ${idToFile.size} rows from Storage cards/metadata.csv`);
  }

  const { cards } = cardsJson as CardsFile;
  const slice = args.limit ? cards.slice(0, args.limit) : cards;

  const rows: DesignInsert[] = [];
  let missingImage = 0;

  for (const card of slice) {
    const description =
      (card.description || card.blurb || "").trim() ||
      card.title ||
      "植物標本卡";

    let preview_url: string | null = null;
    const storageFile = idToFile.get(card.id);
    if (storageFile) {
      preview_url = buildStoragePublicUrl(
        supabaseUrl,
        args.bucket,
        storageFile
      );
    } else if (card.images?.[0]) {
      const base = basenameFromImagePath(card.images[0]);
      preview_url = buildStoragePublicUrl(supabaseUrl, args.bucket, base);
    } else {
      missingImage++;
    }

    rows.push({
      id: card.id,
      name: card.title,
      description,
      preview_url,
      total_price: card.priceTwd ?? 0,
    });
  }

  console.log(`Prepared ${rows.length} designs (${missingImage} without image path).`);
  if (rows[0]) {
    console.log("Sample:", {
      id: rows[0].id,
      name: rows[0].name.slice(0, 40),
      preview_url: rows[0].preview_url,
      total_price: rows[0].total_price,
    });
  }

  if (args.dryRun) {
    console.log("Dry run — no database writes.");
    return;
  }

  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: false,
  });
  await client.connect();

  const batchSize = 50;
  let inserted = 0;

  try {
    await client.query("BEGIN");
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      for (const row of batch) {
        await client.query(
          `INSERT INTO designs (id, name, description, preview_url, total_price)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             preview_url = EXCLUDED.preview_url,
             total_price = EXCLUDED.total_price,
             updated_at = CURRENT_TIMESTAMP`,
          [
            row.id,
            row.name,
            row.description,
            row.preview_url,
            row.total_price,
          ]
        );
        inserted++;
      }
      console.log(`Upserted ${Math.min(i + batchSize, rows.length)} / ${rows.length}`);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }

  const count = await new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: false,
  });
  await count.connect();
  const res = await count.query("SELECT count(*)::int AS n FROM designs");
  console.log(`Done. Upserted ${inserted} rows. designs table now has ${res.rows[0].n} rows.`);
  await count.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
