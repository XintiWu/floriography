# 送禮情境 → 欄位解析

## 流程

1. Ollama 抽出欄位（`analyzeStoryWithOllama`）
2. `sanitizeParsedFields` 過濾空值／「無」等占位
3. **`coerceFieldsFromStory`**：用規則引擎補正漏填、刪除幻覺，並以原文最長匹配驗證對象詞

規則實作：`src/lib/parseStoryRules.ts`

## 測試（10 則，不呼叫 Ollama）

```bash
npm run test:parse-fields
# 或
npx tsx scripts/test-parse-story-fields.ts --only F1,F2
```

測試資料：`src/data/storyFieldFixtures.ts`（F1–F10）

每則會驗證三種情況：純規則、LLM 全空、LLM 幻覺（對象=朋友、情緒=思念）。

## 調整演算法

1. 在 `storyFieldFixtures.ts` 新增或修改期望
2. 執行 `npm run test:parse-fields` 直到 10/10
3. 必要時擴充 `RECIPIENT_TERMS`、`OCCASION_KEYWORDS`、`MOOD_KEYWORDS`
4. 完整推薦路徑仍可用 `npx tsx scripts/benchmark-recommend-prompts.ts`

## 標籤微調（右欄 UI）

- **花語意涵**：`FLOWER_MEANING_TAGS`（`#康復` 等僅顯示用），可多選 +「其他」
- **情緒氛圍**：`MOOD_ATMOSPHERE_TAGS`，可多選；`沉靜` 等粗排時映射至作品標籤
- 選取結果以 `、` 寫入 `flowerMeaning` / `mood` 欄位，按「重新生成」走 `refine` API

## 花語顧問解析（consultantReply）

- analyze / refine 回傳 `consultantReply`（80~160 字顧問敘述）與 `highlightTerms`
- 顯示於推薦卡片上方的「花語顧問解析」區塊；各卡仍保留較短的「為何推薦這張」

## F1–F12 摘要

| ID | 情境重點 | 預期對象 |
|----|----------|----------|
| F1 | 受傷的兄弟、康復 | 兄弟 |
| F2 | 受傷的摯友、康復 | 摯友 |
| F3 | 畢業摯友、粉色、鼓勵與希望 | 摯友 |
| F4 | 紀念日、老婆、香檳色 | 老婆 |
| F5 | 謝謝老師、溫柔 | 老師 |
| F6 | 升職上司、祝賀 | 上司 |
| F7 | 女朋友、紀念日、酒紅 | 女朋友 |
| F8 | 妹妹考上台大 | 妹妹 |
| F9 | 鄰居阿姨、感謝 | 鄰居 |
| F10 | 媽媽生日、預算 80 | 媽媽 |
| F11 | 情人節男朋友、謝謝 | 男朋友 |
| F12 | 住院爸爸、康復 | 爸爸 |
