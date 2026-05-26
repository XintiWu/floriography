/**
 * 從商品圖擷取多種主要顏色（像素採樣 + k-means），映射為繁中色名。
 * 建置腳本專用；略過近白紙底與過暗背景，聚焦花材本體色。
 */
import sharp from "sharp";

export type ExtractColorOptions = {
  /** 最多回傳幾種主色標籤 */
  maxColors?: number;
  /** 縮圖邊長（愈小愈快） */
  sampleSize?: number;
};

type Rgb = [number, number, number];

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

/** 將 RGB 映射為與推薦表單一致的中文色名 */
export function rgbToChineseColorLabel(r: number, g: number, b: number): string {
  const [h, s, l] = rgbToHsl(r, g, b);

  if (l < 0.14) return "黑";
  if (l > 0.9 && s < 0.12) return "白";
  if (s < 0.1) {
    if (l > 0.78) return "米";
    if (l > 0.55) return "奶油";
    if (l < 0.28) return "黑";
    return "棕";
  }

  if (l > 0.82 && s < 0.25) return "奶油";

  if (h < 12 || h >= 348) {
    if (l > 0.72 && s < 0.45) return "粉";
    return "紅";
  }
  if (h < 38) return l > 0.6 ? "橘" : "紅";
  if (h < 68) return "黃";
  if (h < 165) return "綠";
  if (h < 200) return "藍";
  if (h < 260) return "紫";
  if (h < 290) return "紫";
  if (h < 330) return l > 0.65 ? "粉" : "紅";
  return "紅";
}

function colorDist(a: Rgb, b: Rgb): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function kMeans(pixels: Rgb[], k: number, iterations = 12): Rgb[] {
  if (pixels.length === 0) return [];
  const step = Math.max(1, Math.floor(pixels.length / k));
  let centroids: Rgb[] = [];
  for (let i = 0; i < k; i++) {
    centroids.push(pixels[Math.min(i * step, pixels.length - 1)]);
  }

  const assignments = new Array(pixels.length).fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < pixels.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = colorDist(pixels[i], centroids[c]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      assignments[i] = best;
    }
    const sums: Array<[number, number, number, number]> = centroids.map(() => [
      0, 0, 0, 0,
    ]);
    for (let i = 0; i < pixels.length; i++) {
      const a = assignments[i];
      sums[a][0] += pixels[i][0];
      sums[a][1] += pixels[i][1];
      sums[a][2] += pixels[i][2];
      sums[a][3] += 1;
    }
    centroids = sums.map((s) => {
      if (s[3] === 0) return [128, 128, 128] as Rgb;
      return [
        Math.round(s[0] / s[3]),
        Math.round(s[1] / s[3]),
        Math.round(s[2] / s[3]),
      ] as Rgb;
    });
  }

  const counts = new Array(centroids.length).fill(0);
  for (const a of assignments) counts[a]++;
  return centroids
    .map((c, i) => ({ c, n: counts[i] }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.c);
}

/** 略過紙底白、極暗陰影 */
function isBackgroundPixel(r: number, g: number, b: number): boolean {
  const [h, s, l] = rgbToHsl(r, g, b);
  if (l > 0.92 && s < 0.08) return true;
  if (l < 0.06) return true;
  if (l > 0.85 && s < 0.06) return true;
  void h;
  return false;
}

/**
 * 從本機圖片路徑擷取主要顏色標籤（繁中）。
 */
export async function extractDominantColorLabels(
  imagePath: string,
  options: ExtractColorOptions = {}
): Promise<string[]> {
  const maxColors = options.maxColors ?? 3;
  const sampleSize = options.sampleSize ?? 72;

  const { data, info } = await sharp(imagePath)
    .rotate()
    .resize(sampleSize, sampleSize, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels: Rgb[] = [];
  const channels = info.channels;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isBackgroundPixel(r, g, b)) continue;
    pixels.push([r, g, b]);
  }

  if (pixels.length < 8) {
    return [];
  }

  const k = Math.min(5, Math.max(2, Math.floor(pixels.length / 80)));
  const centroids = kMeans(pixels, k);
  const labels: string[] = [];
  const seen = new Set<string>();

  for (const c of centroids) {
    const label = rgbToChineseColorLabel(c[0], c[1], c[2]);
    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
    if (labels.length >= maxColors) break;
  }

  return labels;
}
