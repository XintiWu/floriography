# 情境推薦：Gemini API 與 Ollama 備援

情境推薦（`/api/recommend`、`/api/parse-story`）預設使用 **Gemini 2.5 Flash**；若 Gemini 不可用且 `RECOMMEND_LLM_PROVIDER=auto`，會自動改走本機 **Ollama**（與改版前相同 pipeline）。

花朵圖片辨識（`/api/recognize`）也使用同一組 `GEMINI_API_KEY`。

---

## 1. 取得 Gemini API Key

1. 開啟 [Google AI Studio](https://aistudio.google.com/apikey)（需 Google 帳號）。
2. 點 **「Create API key」**（建立 API 金鑰）。
3. 選擇：
   - **Create API key in new project**（新專案），或
   - 綁定既有 Google Cloud 專案。
4. 複製產生的金鑰（格式類似 `AIza...`）。**只會完整顯示一次**，請立刻存到安全處。
5. （建議）在 AI Studio 左側 **Usage / Limits** 確認免費額度與每分鐘請求上限。

> 若部署到 Vercel 等雲端，請在平台「Environment Variables」設定同名變數，不要將金鑰提交到 git。

---

## 2. 本機環境變數（`.env.local`）

在專案根目錄建立或編輯 `.env.local`（此檔已在 `.gitignore`，不會進版控）：

```bash
# 必填（Gemini 主線）
GEMINI_API_KEY=你的_API_金鑰

# 選填：推薦用模型（預設 gemini-2.5-flash，與花朵辨識相同）
GEMINI_RECOMMEND_MODEL=gemini-2.5-flash

# 選填：auto | gemini | ollama（預設 auto）
# auto = 有 GEMINI_API_KEY 則用 Gemini；Gemini 連線/額度失敗時改 Ollama
RECOMMEND_LLM_PROVIDER=auto

# --- Ollama 備援（auto 或 ollama 時需要）---
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
```

### `RECOMMEND_LLM_PROVIDER` 說明

| 值 | 行為 |
|----|------|
| `auto`（預設） | 有 `GEMINI_API_KEY` → Gemini；Gemini **無法連線/忙碌** → 改 Ollama |
| `gemini` | 僅 Gemini，失敗不回退 |
| `ollama` | 僅本機 Ollama（與舊版相同） |

JSON 解析失敗（502）**不會**自動改 Ollama，避免重複計費與不一致結果。

---

## 3. Ollama 備援（選用）

僅在沒設 `GEMINI_API_KEY`、或 `auto` 且 Gemini 暫時不可用時需要：

```bash
ollama serve
ollama pull llama3.2:3b
```

---

## 4. 驗證

```bash
npm run dev
```

1. 開啟 `http://localhost:3000/recommend`，輸入情境後按「AI 分析並推薦」。
2. 成功時回應的 `engine` 應類似：`Gemini(gemini-2.5-flash),3張AI`。
3. 暫時拿掉或打錯 `GEMINI_API_KEY`，且本機有 `ollama serve`：`auto` 下應出現 `Ollama(llama3.2:3b)...`。

---

## 5. 常見錯誤

| 現象 | 處理 |
|------|------|
| 503 `llm_unavailable`、未設定金鑰 | 補上 `GEMINI_API_KEY` 或啟動 Ollama |
| 503、Gemini 金鑰無效 | 在 AI Studio 重建金鑰，確認未多餘空白 |
| 429 / Gemini 忙碌 | 稍後再試；`auto` 會嘗試 Ollama |
| 502 `llm_parse_failed` | 多為模型 JSON 格式問題，可重試或改 `GEMINI_RECOMMEND_MODEL` |

---

## 6. 相關檔案

- [`src/lib/llmProvider.ts`](../src/lib/llmProvider.ts) — Gemini / Ollama 切換
- [`src/lib/recommendOllama.ts`](../src/lib/recommendOllama.ts) — 推薦 prompt 與解析
- [`src/lib/flowerRecognition.ts`](../src/lib/flowerRecognition.ts) — 辨識用 Gemini
