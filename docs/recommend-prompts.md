# 情境推薦 — 常用測試 Prompt

資料來源：[`src/data/recommendPromptFixtures.ts`](../src/data/recommendPromptFixtures.ts)

## 標準組（benchmark 預設）

| ID | 情境 story | 測試重點 |
|----|------------|----------|
| P1 | 想送給媽媽生日祝福，預算80元 | 場合+預算 |
| P2 | 想送花給受傷的兄弟，祝他早日康復 | 療癒／加油 |
| P3 | 送給即將畢業的摯友，希望粉色、帶鼓勵與希望的花語 | 色調+花語 |
| P4 | 紀念日和老婆過，香檳色，預算120 | 紀念日+色調 |
| P5 | 謝謝老師這學期的教導，要溫柔一點 | 對象+情緒 |
| P6 | 想送一份特別的禮物 | 稀疏輸入 |

## 重複測速變體（類似 P1）

| ID | story |
|----|-------|
| V1-mom-birthday | 同 P1 原文 |
| V2-mom-birthday-alt | 媽媽生日快到了，預算大概八十，想要祝福的感覺 |

## 執行方式

```bash
ollama serve
# .env.local: OLLAMA_MODEL=llama3.2:3b
npm run dev

# 全部標準 prompt
npx tsx scripts/benchmark-recommend-prompts.ts

# 只跑媽媽生日相關（較快）
npx tsx scripts/benchmark-recommend-prompts.ts --only P1,V1-mom-birthday
```

產出：[`recommend-benchmark.md`](recommend-benchmark.md)（含耗時、fields、是否 3 張皆 AI）
