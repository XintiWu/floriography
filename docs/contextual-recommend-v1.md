# 情境推薦系統 v1 — 實作細節報告

本文件說明 **FlowerDB + 文字探勘** 情境推薦的資料管線、價格規則、評分公式、API 行為與已知限制。

## 1. 資料管線（CSV → 建置產物 → API）

| 階段 | 說明 |
|------|------|
| 來源 | [`FlowerDB/metadata.csv`](FlowerDB/metadata.csv)：每列 `ID`、`Original Name`（檔名）、`Tags`（花種，逗號分隔）。 |
| 圖片 | 於 [`FlowerDB/images`](FlowerDB/images) 遞迴掃描，以 **檔名不分大小寫** 對應 `Original Name`；產出公開 URL 為 `/FlowerDB/images/<子資料夾>/<檔名>`。 |
| 花語 | [`meanings.md`](meanings.md) 以 `## **標題**` 區塊解析為「花名 → 全文」對照；CSV 花名與標題不一致時，建置腳本內 [`FLOWER_MEANING_ALIASES`](scripts/build-flower-catalog.ts) 做別名（例：`彩葉莧`→`彩葉草`）。缺漏花種則以單行泛用花語補齊，避免空白索引。 |
| 主色（圖像） | 建置時以 [`sharp`](https://sharp.pixelplumbing.com/) 縮圖採樣 → 略過近白紙底 → **k-means** 聚類 → 映射繁中色名（紅、粉、白、藍、紫、黃、綠、橘、米、黑、奶油、棕等）。邏輯見 [`scripts/lib/extractImageColors.ts`](scripts/lib/extractImageColors.ts)。與花語文字推斷合併後寫入 `tags.colors`（圖像最多 **3** 種主色，合併後標籤最多 6 項）。快速重建可設 `SKIP_IMAGE_COLORS=1`。 |
| 卡片敘述 | 同學校訂的完整文案存於 [`src/data/cardDescriptions.json`](src/data/cardDescriptions.json)；`build:catalog` 會覆蓋寫入 `description`，保留人工敘述並搭配圖像主色。 |
| 水晶花 | `meanings.md` 無獨立章節，於 [`src/lib/meaningsParser.ts`](src/lib/meaningsParser.ts) 注入簡短補丁文案。 |
| 產物 | [`src/data/flowerCatalog.json`](src/data/flowerCatalog.json)：`cards[]` 為與 [`Card`](src/lib/types.ts) 對齊的欄位，外加僅供伺服端使用的 `indexText`（推薦前會剝除）。 |
| 建置 | `npm run build:catalog`（`tsx scripts/build-flower-catalog.ts`）；`prebuild` 會在 `next build` 前自動重產 JSON。 |

## 2. 靜態圖片與 `public/`

Next.js 僅對 [`public/`](public/) 提供穩定靜態路徑。專案內以 **符號連結** [`public/FlowerDB` → `../FlowerDB`](public/FlowerDB) 指回 repo 根目錄的 `FlowerDB`，無需複製 400+ 張圖。若於 Windows 開發且 symlink 不可用，請改為複製 `FlowerDB` 至 `public/FlowerDB` 或自行調整部署策略。

## 3. 價格規則（固定種子、可重現）

建置時依列 `ID` 做 **穩定 hash**，同一商品價格不隨請求改變。

- 若 `Tags` 中任一名稱屬於 **{ 卡斯比亞, 水晶花, 星辰花 }**：`priceTwd = 65 + (hash % 16)` → **65–80**。
- 否則：`priceTwd = 20 + (hash % 101)` → **20–120**。

## 4. 文字探勘（v1 評分）

實作於 [`src/lib/flowerRecommend.ts`](src/lib/flowerRecommend.ts)。

### 4.1 使用者查詢合併

將 `story、recipient、occasion、mood、color` 串成一段文字（`budget` 僅用數值規則，不進 n-gram）。

### 4.2 正規化

去除空白與常見分隔符後轉小寫（主要影響英文片段），供子字串與 n-gram 比對。

### 4.3 特徵與權重（`WEIGHTS`）

| 項目 | 說明 |
|------|------|
| `base` | 基底分，避免全為 0。 |
| `flowerName` | 查詢中出現卡片 **花材全名**（子字串）時加分。 |
| `ngramUnit` | 對查詢與 `indexText` 取 **2–3 字** 滑動片段，計交集數量 × 權重（輕量「詞面重疊」）。 |
| `occasionTag` / `moodTag` | 使用者填寫的場合／情緒與卡片標籤或索引文字命中時加分。 |
| `colorTag` | 色系欄位與卡片色系標籤或索引命中時加分。 |
| `budgetWithin` / `budgetNear` / `budgetFarPenalty` | 與 `priceTwd` 的差距區間加分或扣分。 |

最後分數 **clamp 至 8–98** 作為畫面上「契合度 %」。

### 4.4 推薦理由（`why`）

不依賴 LLM 時，以固定模板組出繁中文句，包含：命中的花材、n-gram 重疊概況、場合標籤、預算說明（若有）。

## 5. API 與 LLM 二階段

[`src/app/api/recommend/route.ts`](src/app/api/recommend/route.ts)：

1. **驗證**：至少一項文字條件或預算（與前端 `hasAnyInput` 對齊）；否則 `400`。
2. **粗排**：對全量 `flowerCatalog` 執行上述文字探勘，取 **Top 20** 作為 LLM 候選池（控制 token）。
3. **精選（可選）**：若設定 `GEMINI_API_KEY` / `OPENAI_API_KEY` / 本機 Ollama，則請模型**僅從候選 id 中**選 3 筆並撰寫理由；回傳欄位 `engine` 標示例如 `TextMining+Gemini`。
4. **後備**：模型失敗、解析失敗或無金鑰時，回傳粗排 **Top 3**，`engine: TextMining`。

## 6. 前端（[`RecommendForm.tsx`](src/components/recommend/RecommendForm.tsx)）

- 結果卡片以 `next/image` 顯示 [`Card.images`](src/lib/types.ts) 第一張。
- 「探索專屬推薦」需 **schema 合法且至少一項輸入**，與 API 一致。
- API 錯誤訊息顯示於表單底部（如全空白送出）。

## 7. 已知限制與後續方向

| 限制 | 說明 |
|------|------|
| 中文分詞 | v1 以 **花全名 + 字元 n-gram** 近似，未導入 jieba 等斷詞；口語與別名覆蓋有限。 |
| 花語缺漏 | 部分 CSV 花種在 `meanings.md` 無標題，僅能依別名或泛用句補齊；可擴充別名表或補寫章節。 |
| 場合／情緒標籤 | 由花語全文 **關鍵字規則** 推斷，非人工標註，語意僅供參考。 |
| 建置缺圖 | 若 `Original Name` 在磁碟不存在，該列會被略過（目前 log：`IMG_9690.JPG` 一例）。 |
| 部署體積 | 約 400 張 JPEG ＋ 1.6MB JSON，若上雲需留意託管大小與 CDN。 |

**可選改進**：專業中文斷詞、向量嵌入（語意相似度）、人工標註「適用情境」欄位、將圖檔改放物件儲存並只存 URL。

---

與 proposal **p11 情境推薦** 對應：輸入為 **送禮對象、情境（自由＋選填）、偏好（場合／情緒／色系／預算）**；輸出為 **適合的植物標本卡**（圖、花材、花語摘要、價格、可解釋理由）。
