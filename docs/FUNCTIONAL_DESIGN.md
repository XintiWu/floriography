## 功能設計（先把「能賣」做穩）

### 1) 漏斗（顧客端）

- **首頁**：品牌主張 + 作品入口 + 三步驟（挑卡→填需求→確認面交）\n
- **作品列表**：篩選（情緒/場合/狀態）+ 卡片預覽\n
- **作品詳情**：大圖、標籤、參考價格、狀態、CTA「預訂/詢價這張」\n
- **預訂/詢價表單**：送出後回傳編號（FR-YYYYMMDD-HHMMSS-XXXX）\n

### 2) 訂單狀態（後台端）

`new → contacted → scheduled → completed / cancelled`

- **new**：剛收到表單\n
- **contacted**：已用 LINE/電話聯絡\n
- **scheduled**：已約定面交時間地點\n
- **completed**：完成交付\n
- **cancelled**：取消\n

### 3) 花語資料庫（內容端）

- 花材列表與詳情頁\n
- 詳情頁展示：花語（meanings）、故事（story）、相關作品（先用標籤關聯）\n

### 4) 情境推薦（可解釋的規則版）

輸入：對象/場合/情緒/預算/色系\n
輸出：前三名作品 + 推薦理由（命中哪些標籤、價格是否接近）\n

### 5) 權限與資料流（Supabase）

- `cards`、`flowers`：公開可讀（前台）\n
- `order_requests`：匿名可新增（表單），authenticated 可讀/改（後台）\n

