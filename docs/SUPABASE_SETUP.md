## Supabase 後台/資料庫設定（從 0 到可用）

### A. 建立專案與環境變數

1) 在 Supabase 建立新專案\n
2) 在專案根目錄建立 `.env.local`（不要提交 git）

```bash
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### B. 建表（含 RLS）

把 [`supabase/migrations/001_init.sql`](../supabase/migrations/001_init.sql) 貼到 Supabase SQL Editor 執行。

重點權限：\n
- `cards` / `flowers`：匿名可讀（前台展示）\n
- `order_requests`：匿名可新增（表單），authenticated 才能讀/改（後台）\n

### C. 建立後台帳號

Supabase → Authentication → Users → Add user（Email/Password）。\n
到網站 `/admin` 用該帳號登入。

### D. 上架內容（最省事的方式）

Supabase → Table Editor：\n
- `cards`：新增作品、圖片 URL（可先填 `/demo/pressed-cards.png`）、標籤（tags_* 欄位）\n
- `flowers`：新增花語與故事\n

完成後前台會自動改讀 Supabase（沒有設定則仍用示範資料）。

### E.（可選）表單通知（Email）

如果你希望每次有人送出預訂/詢價就通知你，在 `.env.local` 加上：

```bash
RESEND_API_KEY="..."
ADMIN_NOTIFY_EMAIL="your@email.com"
RESEND_FROM="Floriography <your-verified@domain.com>"
```

未設定也不影響表單送出與後台查看。

