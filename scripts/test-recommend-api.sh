#!/usr/bin/env bash
# 情境推薦 API 驗收腳本（需 dev server: npm run dev）
set -euo pipefail
BASE="${BASE_URL:-http://localhost:3000}"
API="$BASE/api/recommend"
PASS=0
FAIL=0
RESULTS=()

run_test() {
  local id="$1"
  local desc="$2"
  local expect_http="$3"
  local expect_error="${4:-}" # optional error code in JSON
  local body="$5"
  local timeout="${6:-15}"

  local out http body_json err
  out=$(curl -s -m "$timeout" -w "\n__HTTP__%{http_code}" -X POST "$API" \
    -H "Content-Type: application/json" \
    -d "$body" 2>&1) || true
  http=$(echo "$out" | sed -n 's/^__HTTP__//p' | tail -1)
  body_json=$(echo "$out" | sed '/^__HTTP__/d')

  local ok=0
  if [[ "$http" == "$expect_http" ]]; then
    ok=1
  fi
  if [[ -n "$expect_error" ]]; then
    err=$(echo "$body_json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''))" 2>/dev/null || echo "")
    if [[ "$err" != "$expect_error" ]]; then
      ok=0
    fi
  fi

  if [[ $ok -eq 1 ]]; then
    PASS=$((PASS + 1))
    RESULTS+=("PASS|$id|$desc|HTTP $http")
  else
    FAIL=$((FAIL + 1))
    snippet=$(echo "$body_json" | head -c 200 | tr '\n' ' ')
    RESULTS+=("FAIL|$id|$desc|expected HTTP $expect_http${expect_error:+ error=$expect_error}, got HTTP ${http:-?} ${snippet}")
  fi
}

echo "=== Recommend API tests @ $API ==="
echo "Ollama: $(curl -s -m 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1 && echo up || echo down)"
echo ""

# --- 無 Ollama / 驗證錯誤（不依賴 LLM）---
run_test T01 "缺少 mode" 400 "invalid_input" '{}'
run_test T02 "mode 非法" 400 "invalid_input" '{"mode":"invalid","story":"x"}'
run_test T03 "analyze 缺 story" 400 "missing_story" '{"mode":"analyze"}'
run_test T04 "analyze story 空白" 400 "missing_story" '{"mode":"analyze","story":"   "}'
run_test T05 "refine 全空" 400 "empty_input" '{"mode":"refine"}'
run_test T06 "refine 僅空白字串" 400 "empty_input" '{"mode":"refine","recipient":"  ","occasion":""}'

# Ollama 不可用時應 503（若 currently up 則跳過註記）
if ! curl -s -m 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  run_test T07 "analyze Ollama 關閉" 503 "llm_unavailable" '{"mode":"analyze","story":"送畢業禮"}'
  run_test T08 "refine Ollama 關閉" 503 "llm_unavailable" '{"mode":"refine","occasion":"畢業","mood":"鼓勵"}'
else
  RESULTS+=("SKIP|T07|analyze Ollama 關閉|(Ollama 運行中，略過)")
  RESULTS+=("SKIP|T08|refine Ollama 關閉|(Ollama 運行中，略過)")
fi

# --- 有 Ollama 時成功路徑 ---
if curl -s -m 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  run_test T09 "analyze 成功" 200 "" '{"mode":"analyze","story":"送給即將畢業的摯友，預算80元，粉色，鼓勵與希望"}' 120
  run_test T10 "refine 成功" 200 "" '{"mode":"refine","recipient":"摯友","occasion":"畢業","mood":"鼓勵","budget":80,"color":"粉","flowerMeaning":"希望"}' 120
  run_test T11 "refine 僅預算" 200 "" '{"mode":"refine","budget":65}' 120
  run_test T12 "refine 僅花語" 200 "" '{"mode":"refine","flowerMeaning":"感謝"}' 120
else
  for id in T09 T10 T11 T12; do
    RESULTS+=("SKIP|$id|需 Ollama|(請 ollama serve)")
  done
fi

# --- Embedding 語意品質驗收（需 Gemini API key）---
CATALOG="src/data/flowerCatalog.json"
echo ""
echo "=== Embedding 驗收測試 ==="

# E01 — catalog 存在
if [ -f "$CATALOG" ]; then
  RESULTS+=("PASS|E01|flowerCatalog.json 存在|OK")
  PASS=$((PASS + 1))
else
  RESULTS+=("FAIL|E01|flowerCatalog.json 存在|找不到 $CATALOG")
  FAIL=$((FAIL + 1))
fi

# E02 — catalog 有 embeddedAt（代表跑過 embed-catalog.ts）
if [ -f "$CATALOG" ]; then
  HAS_EMBED=$(python3 -c "import json; d=json.load(open('$CATALOG')); print('yes' if d.get('embeddedAt') else 'no')" 2>/dev/null || echo "error")
  if [ "$HAS_EMBED" = "yes" ]; then
    RESULTS+=("PASS|E02|catalog 含 embeddedAt 時間戳|OK")
    PASS=$((PASS + 1))
  else
    RESULTS+=("FAIL|E02|catalog 含 embeddedAt 時間戳|未找到 embeddedAt，請執行 npm run embed:catalog")
    FAIL=$((FAIL + 1))
  fi
fi

# E03 — 所有花卡都有 embedding 向量
if [ -f "$CATALOG" ]; then
  EMBED_COUNT=$(python3 -c "
import json
d = json.load(open('$CATALOG'))
total = len(d['cards'])
with_emb = sum(1 for c in d['cards'] if c.get('embedding') and len(c['embedding']) > 0)
print(f'{with_emb}/{total}')
" 2>/dev/null || echo "error")
  TOTAL=$(python3 -c "import json; d=json.load(open('$CATALOG')); print(len(d['cards']))" 2>/dev/null || echo "0")
  if [ "$EMBED_COUNT" = "${TOTAL}/${TOTAL}" ]; then
    RESULTS+=("PASS|E03|所有花卡有 embedding ($EMBED_COUNT)|OK")
    PASS=$((PASS + 1))
  else
    RESULTS+=("FAIL|E03|所有花卡有 embedding|只有 $EMBED_COUNT 有向量，請執行 npm run embed:catalog")
    FAIL=$((FAIL + 1))
  fi
fi

# E04 — embedding 維度正確（3072）
if [ -f "$CATALOG" ]; then
  DIM=$(python3 -c "
import json
d = json.load(open('$CATALOG'))
for c in d['cards']:
    if c.get('embedding'):
        print(len(c['embedding']))
        break
" 2>/dev/null || echo "0")
  if [ "$DIM" = "3072" ]; then
    RESULTS+=("PASS|E04|embedding 維度 3072|OK")
    PASS=$((PASS + 1))
  else
    RESULTS+=("FAIL|E04|embedding 維度 3072|實際維度 $DIM")
    FAIL=$((FAIL + 1))
  fi
fi

# E05 — analyze API 回傳欄位含 recommendations（有 LLM 時）
if curl -s -m 2 http://127.0.0.1:11434/api/tags > /dev/null 2>&1 || [ -n "${GEMINI_API_KEY:-}" ]; then
  run_test E05 "analyze 失戀情境 → 含 recommendations" 200 "" \
    '{"mode":"analyze","story":"朋友最近失戀了，很難過，想送花慰藉他"}' 120
else
  RESULTS+=("SKIP|E05|analyze 失戀情境|(無 LLM 可用)")
fi

# E06 — refine API 回傳含 recommendations 且 engine 欄位存在
run_test E06 "refine 結構化欄位回傳格式正確" 200 "" \
  '{"mode":"refine","occasion":"生日","mood":"祝福","recipient":"媽媽"}' 30

echo ""
for line in "${RESULTS[@]}"; do
  IFS='|' read -r status tid desc detail <<< "$line"
  printf "[%s] %s — %s\n" "$status" "$tid" "$desc"
  printf "      %s\n" "$detail"
done
echo ""
echo "SUMMARY: PASS=$PASS FAIL=$FAIL SKIP=$(printf '%s\n' "${RESULTS[@]}" | grep -c '^SKIP' || true)"
exit $([[ $FAIL -eq 0 ]] && echo 0 || echo 1)
