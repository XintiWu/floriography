/**
 * Build src/data/flowerCatalog.json from FlowerDB/metadata.csv, images, and meanings.md
 * Run: npx tsx scripts/build-flower-catalog.ts
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { parseMeaningsMd } from "../src/lib/meaningsParser";
import { extractDominantColorLabels } from "./lib/extractImageColors";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SPECIAL_FLOWERS = new Set(["卡斯比亞", "水晶花", "星辰花"]);

/** CSV / 口語花名 → meanings.md 標題鍵 */
const FLOWER_MEANING_ALIASES: Record<string, string> = {
  米香花: "米粒",
  針葉櫻桃葉: "針葉櫻桃",
  朱槿葉: "南美朱槿",
  玫瑰葉: "玫瑰",
  白櫻花: "白色櫻花",
};

const GENERIC_MEANING =
  "此花材為植物標本系列常見搭配，保留自然形態與季節記憶，象徵單純的陪伴與祝福。";

function resolveMeaningText(
  flower: string,
  meanings: ReturnType<typeof parseMeaningsMd>
): string {
  const key = FLOWER_MEANING_ALIASES[flower] ?? flower;
  return meanings[key] ?? meanings[flower] ?? "";
}

function stableHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

function priceForRow(id: string, flowerNames: string[]): number {
  const h = stableHash(id);
  const hit = flowerNames.some((f) => SPECIAL_FLOWERS.has(f));
  if (hit) return 65 + (h % 16);
  return 20 + (h % 101);
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

function walkImages(dir: string, map: Map<string, string>): void {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkImages(p, map);
    else if (/\.(jpe?g|png)$/i.test(ent.name))
      map.set(ent.name.toLowerCase(), p);
  }
}

function inferTags(meaningBlob: string, flowers: string[]) {
  const occasions = new Set<string>();
  const moods = new Set<string>();
  const colors = new Set<string>();
  const t = `${meaningBlob}\n${flowers.join("、")}`;

  if (/婚禮|情人節|表白|愛戀|戀愛|熱戀|紀念日/.test(t)) {
    occasions.add("紀念日");
    moods.add("愛情");
  }
  if (/思念|想念|懷念/.test(t)) moods.add("思念");
  if (/祝福|希望|加油|鼓勵|溫暖/.test(t)) moods.add("祝福");
  if (/畢業|前程/.test(t)) occasions.add("畢業");
  if (/生日/.test(t)) occasions.add("生日");
  if (/道歉|感謝|謝謝/.test(t)) occasions.add("日常");
  if (/家人|父母|長輩/.test(t)) occasions.add("日常");

  for (const c of ["紅", "粉", "白", "藍", "紫", "黃", "綠", "橘", "米", "黑", "奶油"]) {
    if (t.includes(`${c}色`) || new RegExp(`${c}[玫瑰櫻花]`).test(t)) colors.add(c);
  }

  if (occasions.size === 0) occasions.add("日常");
  if (moods.size === 0) moods.add("祝福");

  return {
    occasions: [...occasions],
    moods: [...moods],
    colors: [...colors],
  };
}

/** 圖像辨識主色優先，花語文字推斷為輔 */
function mergeColorTags(imageColors: string[], textColors: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of imageColors) {
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  for (const c of textColors) {
    if (c === "自然色系") continue;
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  if (out.length === 0) out.push("自然色系");
  return out.slice(0, 3);
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n)}…`;
}

type CatalogCard = {
  id: string;
  title: string;
  priceTwd: number;
  status: "available";
  images: string[];
  size: string;
  materials: string[];
  leadTimeDays: number;
  tags: {
    occasions: string[];
    colors: string[];
    flowers: string[];
    moods: string[];
  };
  blurb: string;
  description?: string;
  imageWidth?: number;
  imageHeight?: number;
  indexText: string;
};

const imageMetaCache = new Map<string, { w: number; h: number }>();

async function getImageSize(abs: string): Promise<{ w: number; h: number }> {
  const cached = imageMetaCache.get(abs);
  if (cached) return cached;
  const meta = await sharp(abs).metadata();
  const size = { w: meta.width ?? 800, h: meta.height ?? 1067 };
  imageMetaCache.set(abs, size);
  return size;
}

async function main(): Promise<void> {
  const skipImageColors = process.env.SKIP_IMAGE_COLORS === "1";
  if (skipImageColors) {
    console.warn("[build-flower-catalog] SKIP_IMAGE_COLORS=1 — 僅用文字推斷色系");
  }

  const meaningsRaw = readFileSync(join(ROOT, "meanings.md"), "utf8");
  const meanings = parseMeaningsMd(meaningsRaw);

  const descPath = join(ROOT, "src", "data", "cardDescriptions.json");
  const cardDescriptions: Record<string, string> = existsSync(descPath)
    ? (JSON.parse(readFileSync(descPath, "utf8")) as Record<string, string>)
    : {};
  if (Object.keys(cardDescriptions).length > 0) {
    console.log(
      `[build-flower-catalog] loaded ${Object.keys(cardDescriptions).length} curated descriptions`
    );
  }

  const imagesRoot = join(ROOT, "FlowerDB", "images");
  const basenameToAbs = new Map<string, string>();
  walkImages(imagesRoot, basenameToAbs);

  const csvPath = join(ROOT, "FlowerDB", "metadata.csv");
  const csvText = readFileSync(csvPath, "utf8");
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  const header = lines[0];
  if (!header?.includes("ID") || !header.includes("Original Name")) {
    throw new Error("Unexpected metadata.csv header");
  }

  const cards: CatalogCard[] = [];
  const nameSet = new Set<string>();
  const imageColorCache = new Map<string, string[]>();
  let colorExtractOk = 0;
  let colorExtractFail = 0;

  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvLine(lines[li]);
    if (cols.length < 3) continue;
    const id = cols[0];
    const originalName = cols[1].replace(/^"|"$/g, "");
    const tagsRaw = cols[2];
    const flowers = tagsRaw
      .split(/[,，、]/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const f of flowers) nameSet.add(f);

    const abs = basenameToAbs.get(originalName.toLowerCase());
    if (!abs) {
      console.warn(`[build-flower-catalog] missing image: ${originalName} (${id})`);
      continue;
    }

    const relFromFlowerDb = relative(join(ROOT, "FlowerDB"), abs).split("\\").join("/");
    const imageUrl = `/FlowerDB/${relFromFlowerDb}`;

    const meaningParts = flowers.map((f) => {
      const t = resolveMeaningText(f, meanings);
      return t ? t : `${f}：${GENERIC_MEANING}`;
    });
    const meaningBlob = meaningParts.join("\n\n");

    const { occasions, moods, colors: textColors } = inferTags(meaningBlob, flowers);

    let imageColors: string[] = [];
    if (!skipImageColors) {
      if (!imageColorCache.has(abs)) {
        try {
          imageColors = await extractDominantColorLabels(abs, { maxColors: 3 });
          imageColorCache.set(abs, imageColors);
          if (imageColors.length > 0) colorExtractOk++;
          else colorExtractFail++;
        } catch (err) {
          console.warn(
            `[build-flower-catalog] color extract failed: ${originalName}`,
            err instanceof Error ? err.message : err
          );
          imageColorCache.set(abs, []);
          colorExtractFail++;
        }
      } else {
        imageColors = imageColorCache.get(abs) ?? [];
      }
    }

    const colors = mergeColorTags(imageColors, textColors);

    const title =
      flowers.length <= 2
        ? `${flowers.join("、")} · 植物標本卡`
        : `${flowers[0]}、${flowers[1]} 等 · 植物標本卡`;

    const blurb = clip(meaningBlob || "手工植物標本，封存自然片刻。", 160);
    const description =
      cardDescriptions[id]?.trim() || clip(meaningBlob || blurb, 420);

    const indexText = [
      flowers.join(" "),
      title,
      blurb,
      description,
      meaningBlob,
      occasions.join(" "),
      moods.join(" "),
      colors.join(" "),
    ]
      .join("\n")
      .toLowerCase();

    const { w: imageWidth, h: imageHeight } = await getImageSize(abs);

    cards.push({
      id,
      title,
      priceTwd: priceForRow(id, flowers),
      status: "available",
      images: [imageUrl],
      imageWidth,
      imageHeight,
      size: "約 10×15 cm（依花材略異）",
      materials: ["壓花標本", "乾燥植物"],
      leadTimeDays: 3,
      tags: { occasions, colors, flowers, moods },
      blurb,
      description,
      indexText,
    });
  }

  const dictionary = [...nameSet].sort((a, b) => b.length - a.length);

  const outDir = join(ROOT, "src", "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "flowerCatalog.json");
  writeFileSync(
    outPath,
    JSON.stringify({ cards, dictionary, builtAt: new Date().toISOString() }, null, 0),
    "utf8"
  );

  console.log(
    `[build-flower-catalog] wrote ${cards.length} cards, dict ${dictionary.length} names → ${outPath}`
  );
  if (!skipImageColors) {
    console.log(
      `[build-flower-catalog] image colors: ${imageColorCache.size} unique files, ok=${colorExtractOk}, empty/fail=${colorExtractFail}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
