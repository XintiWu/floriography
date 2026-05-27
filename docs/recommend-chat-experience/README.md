# 情境推薦頁（`/recommend`）完整功能說明

本文件描述「情境推薦」分頁目前完整功能，不限於近期改版。

## 1. 頁面目標

`/recommend` 是以自然語言故事驅動的選卡頁面：

- 使用者輸入送禮故事
- 系統解析故事為結構化條件
- 依條件推薦三張卡片
- 顯示花語顧問解析與每張卡片推薦理由
- 允許使用者再微調右側欄位後重新生成

## 2. 主要 UI 區塊

### 2.1 左欄：故事與顧問聊天室

- `送禮情境自由描述` 文字輸入（約三行高度，支援 `Enter` 送出、`Shift+Enter` 換行）
- `AI 分析並推薦` 按鈕
- `花語顧問聊天室`（預設即顯示）
  - 初始引導訊息
  - 使用者訊息泡泡
  - 顧問回覆泡泡
- 分析進度卡（3 點動畫 + 階段訊息）

### 2.2 右欄：條件欄位（可微調）

- 指定送禮對象
- 偏好場合
- 期望氛圍與情緒（chip）
- 期望花語／心意（chip，僅既有 # tag，不提供自由輸入）
- 理想預算上限
- 偏好色調
- `重新生成` 按鈕

### 2.3 下方：推薦卡片區

- 三張推薦卡（契合度、作品圖、作品設計理念、為何推薦）
- 可展開詳情與前往預訂
- 清除結果返回微調

### 2.4 右下：浮動顧問摘要氣泡

- 顯示完整顧問回覆（內部可捲動）
- 推薦完成後出現
- 點擊可回到上方 `STORY INPUT` 區塊

## 3. 資料流程

### 3.1 `AI 分析並推薦`（兩段式）

1. 前端呼叫 `POST /api/parse-story`
2. 取得欄位後，逐格填入右欄（短延遲）
3. 前端呼叫 `POST /api/recommend`（`mode=refine`）
4. 取得 `consultantReply` + `recommendations`
5. 自動捲至推薦卡片區

### 3.2 `重新生成`

- 以目前右欄欄位呼叫 `POST /api/recommend`（`mode=refine`）
- 更新顧問回覆與三張卡片

## 4. 標籤回填策略

情緒／花語 chips 的來源順序：

1. API 回傳欄位（`mood`, `flowerMeaning`）
2. 若無法對應既有 tags，啟用故事關鍵字 fallback（regex 對應到既有 tags）

目的：避免「解析成功但 chips 沒亮」的體感問題。

## 5. 文案品質控制

### 5.1 禁止英文混入

推薦理由與顧問文案會經過清洗：

- 將常見英文詞（例如 `dad`, `parental love`）轉中文
- 移除殘留英文字母單字

### 5.2 禁用不自然詞

- 將 `不建議` 調整為較中性語氣（例如 `建議避免`）
- 避免顧問回覆出現不自然助詞結尾（例如 `呀`、`啦`）

### 5.3 收尾句一致性

顧問回覆會補齊結尾句，銜接下方三張卡片推薦。

## 6. 狀態與互動細節

分析階段顯示：

- `正在解析您的故事`
- `正在整理需求欄位`
- `正在為您推薦卡片`

推薦完成後：

- 自動捲動到卡片區
- 顯示浮動顧問氣泡，提供快速回看

## 7. 失敗與降級行為

- `parse-story` 失敗：顯示錯誤，不進入推薦階段
- `recommend` 失敗：保留已填欄位，允許微調重試
- LLM 文案品質不足時：使用 fallback 顧問文案

## 8. 後端 API（本頁使用）

- `POST /api/parse-story`
  - input: `{ story }`
  - output: `recipient, occasion, mood, budget, color, flowerMeaning`

- `POST /api/recommend`
  - input: `{ mode: "analyze" | "refine", ...fields }`
  - output: `consultantReply, highlightTerms, recommendations, engine`

## 9. 關鍵程式檔案

- `src/components/recommend/RecommendForm.tsx`
  - 頁面主要互動與狀態管理
- `src/components/recommend/RecommendLoadingProgress.tsx`
  - 分析狀態顯示
- `src/lib/recommendOllama.ts`
  - 顧問回覆生成、fallback、推薦解析
- `src/lib/recommendTone.ts`
  - 語氣與文案清洗規則
- `src/data/recommendTagOptions.ts`
  - 右欄 tags 定義

## 10. 驗收清單（建議）

- [ ] 輸入故事後右欄欄位會逐格填入
- [ ] 情緒/花語 chips 能成功亮起
- [ ] 推薦理由不出現英文混雜
- [ ] 不出現 `不建議` 原樣字詞
- [ ] 推薦完成自動捲到卡片區
- [ ] 右下氣泡不遮擋主要內容，且可回到 STORY INPUT
- [ ] 重新生成可更新顧問回覆與三張卡片
