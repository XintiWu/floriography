# 情境推薦改版 — 測試報告

**測試日期**：2026-05-26  
**環境**：本機 `npm run dev`（`http://localhost:3000`）、FlowerDB 424 張卡、`OLLAMA_HOST` 預設 `http://127.0.0.1:11434`  
**自動化腳本**：`scripts/test-recommend-api.sh`

---

## 1. 測試摘要

| 類別 | 結果 |
|------|------|
| 輸入驗證（400） | **8/8 通過** |
| Ollama 不可用（503） | **通過**（API + 瀏覽器） |
| 無假推薦 / 無 TextMining 最終輸出 | **通過** |
| `npm run build` | **通過** |
| 其他頁面（`/studio`、`/gallery`、`/floriography`） | **HTTP 200** |
| Ollama 成功路徑（200 + 3 張卡） | **不穩定**（約 20–40% 成功率，見 §4） |
| 前端 Hydration 警告 | **發現**（見 §5） |

**整體結論**：改版後的**錯誤處理、輸入驗證、UI 流程、無 fallback** 符合計畫；**依賴 Ollama 的成功推薦**在現有模型（`llama3.2:latest`）下**成功率偏低**，建議上線前加強（重試、模型設定或 prompt 調校）。

---

## 2. API 測試明細

### 2.1 輸入驗證（不依賴 Ollama）

| ID | 情境 | 預期 | 結果 |
|----|------|------|------|
| T01 | body 缺少 `mode` | 400 `invalid_input` | PASS |
| T02 | `mode` 非法 | 400 `invalid_input` | PASS |
| T03 | `analyze` 無 `story` | 400 `missing_story` | PASS |
| T04 | `analyze` story 僅空白 | 400 `missing_story` | PASS |
| T05 | `refine` 全欄空 | 400 `empty_input` | PASS |
| T06 | `refine` 僅空白字串 | 400 `empty_input` | PASS |

### 2.2 Ollama 不可用

| ID | 情境 | 預期 | 結果 |
|----|------|------|------|
| T07 | `analyze` + Ollama 關閉 | 503 `llm_unavailable` | PASS |
| T08 | `refine` + Ollama 關閉 | 503 `llm_unavailable` | PASS |

回應範例：

```json
{
  "error": "llm_unavailable",
  "message": "無法連線 Ollama（http://127.0.0.1:11434）。請執行 ollama serve 並確認已 pull 模型。"
}
```

**確認**：回應中**沒有** `recommendations` 陣列，不會出現假分數或 TextMining Top3。

### 2.3 Ollama 可用時的成功路徑

| ID | 情境 | 預期 | 實測 |
|----|------|------|------|
| T09 | `analyze` 完整情境句 | 200 + `fields` + 3 張卡 | **間歇 FAIL**（502 `llm_parse_failed`） |
| T10 | `refine` 多欄位 | 200 + 3 張卡 | **間歇 FAIL** |
| T11 | `refine` 僅 `budget` | 200 | **PASS**（單次批次） |
| T12 | `refine` 僅 `flowerMeaning` | 200 | **間歇 FAIL** |

**連續 5 次 `refine`（畢業／鼓勵／預算 80／粉）**：1 次 200，4 次 502。

成功時回應結構驗證：

- `recommendations.length === 3`
- 每筆含 `card.id`、`score`（數字）、`why`（非空）
- `card` **不含** `indexText`（未外洩伺服端索引）
- `engine` 形如 `Ollama(llama3.2:latest)`

### 2.4 `/api/parse-story`

| 情境 | 結果 |
|------|------|
| Ollama 啟動 + 有效 `story` | **200**，回傳 `recipient/occasion/mood/budget/color` + `engine` |
| Ollama 關閉 | **503**（與 recommend 一致） |

---

## 3. 瀏覽器測試（`/recommend`）

| 情境 | 觀察 | 結果 |
|------|------|------|
| 頁面載入 | 標題、雙欄表單、「期望花語／心意」、按鈕文案正確 | PASS |
| 初始狀態 | 「重新生成」disabled；提示需先 AI 分析或填右欄 | PASS |
| Ollama 關閉 →「AI 分析並推薦」 | 表單 loading → 上方顯示連線錯誤；**無**下方推薦卡；表單仍可見 | PASS |
| 手動填場合／情緒 | 「重新生成」enabled | PASS |
| Ollama 關閉 →「重新生成」 | 同樣顯示 503 錯誤訊息；無推薦卡 | PASS |
| 成功推薦（先前手動驗證） | 結果在表單**下方**；可「修改需求」清空 | PASS（設計符合） |

---

## 4. 已知問題與根因

### 4.1 LLM 推薦不穩定（502 `llm_parse_failed`）

**現象**：`parseStoryWithOllama` 多半成功；`recommendWithOllama` 常失敗，訊息為：

- `Ollama 僅回傳 N 張有效候選，需要 3 張且 cardId 必須來自清單`（模型回傳的 id 不在候選 UUID 中，或只回 1–2 筆）
- `無法解析 Ollama 回傳的推薦 JSON`（JSON 格式錯誤）

**可能原因**：

1. 小模型對「必須使用完整 UUID」遵守度差。
2. 候選清單雖已精簡，但 12 筆仍易讓模型捏造 id 或只選一張。
3. 兩段式呼叫（parse + recommend）累積延遲，冷啟動約 20–40s。

**建議（未實作，供後續）**：

- `.env.local` 固定 `OLLAMA_MODEL=llama3.2:latest`（或較遵從 JSON 的模型）。
- API 對 `llm_parse_failed` **自動重試 1–2 次**（仍不 fallback 假卡）。
- Prompt 再強調：僅能複製候選中的 `id` 字串，禁止改寫。
- 若仍不足，可考慮「LLM 失敗時用粗排 Top3 + 簡短理由」作**明確標示的降級**（需產品決策，目前計畫為禁止）。

### 4.2 React Hydration 警告（dev）

**現象**：開發模式 overlay 指出 `RecommendForm.tsx` 約第 462 行 hydration mismatch。  
**影響**：dev 噪音；未在 production build 中單獨驗證是否仍出現。  
**建議**：檢查表單初始 state 與 SSR 是否一致（例如 `budget` 空字串 vs `undefined`）。

---

## 5. 回歸與架構確認

| 檢查項 | 結果 |
|--------|------|
| 前端未使用 `parseStoryWithRules` | PASS（`src/components` 無引用） |
| API 無 `RECOMMEND_USE_LLM` / TextMining 最終輸出 | PASS |
| `scoreCatalogLocally` 僅作候選縮小（Top 12） | PASS |
| `/studio`、`/gallery`、`/floriography` | HTTP 200 |

---

## 6. 如何重跑測試

```bash
# 終端 1
npm run dev

# 終端 2 — Ollama 關閉時的驗證
BASE_URL=http://localhost:3000 ./scripts/test-recommend-api.sh

# 終端 3 — 需成功路徑時
ollama serve
# 可選：export OLLAMA_MODEL=llama3.2:latest
BASE_URL=http://localhost:3000 ./scripts/test-recommend-api.sh
```

手動 UI：開啟 `http://localhost:3000/recommend`，分別在 Ollama 開／關時操作「AI 分析並推薦」與「重新生成」。

---

## 7. 驗收清單對照（計畫原文）

| # | 項目 | 狀態 |
|---|------|------|
| 1 | 左欄情境 → AI 分析 → 右欄帶入 + 下方 3 卡 | **部分**（流程正確，成功率受 Ollama 影響） |
| 2 | 改右欄 → 重新生成 → 結果更新 | **部分**（同上） |
| 3 | 關閉 Ollama → 錯誤、無推薦卡 | **通過** |
| 4 | `/studio`、`/gallery` 行為不變 | **通過**（僅 smoke HTTP 200） |

---

## 8. 合併呼叫後基準（2026-05-26）

改版：`analyze` 單次 Ollama + `llama3.2:3b` + 候選 **n 編號（1~8）** 取代 UUID。

詳見 [`docs/recommend-benchmark.md`](recommend-benchmark.md)、常用 prompt [`docs/recommend-prompts.md`](recommend-prompts.md)。

| 指標 | 結果（暖機後） |
|------|----------------|
| 3 張皆 AI 成功率 | **6/6（100%）** |
| analyze 耗時 | 約 **18–26s** |
| refine（P1） | **21s**，3 張 AI |

較初版合併（UUID cardId、常需補位）明顯改善；仍建議 `ollama serve` 常駐。

---

*報告由自動化腳本、curl、tsx 直連 `recommendOllama`、瀏覽器操作綜合產出。*
