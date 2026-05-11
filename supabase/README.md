## Supabase 設定（MVP）

### 1) 建立專案與環境變數

在 Supabase 建立一個新專案後，於此專案根目錄新增 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### 2) 建表與權限（RLS）

把 [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) 內容貼到 Supabase 的 SQL Editor 執行。

此 schema 做了：

- `cards`、`flowers`：**公開可讀**（用於前台）
- `order_requests`：**匿名可新增**（預訂/詢價表單），但**只有 authenticated 可讀/改**（後台）

### 3) 建立後台帳號

到 Supabase → Authentication → Users 建立 Email/Password 使用者。\n
在網站 `/admin` 用該帳號登入即可讀取最近 50 筆詢價。

### 4) 上架內容

你可以先在 Supabase Table Editor 直接新增：

- `cards`：作品、價格、狀態、標籤（tags_* 欄位）
- `flowers`：花語資料

接著把前台 `sampleData` 替換成從 Supabase 讀取（下一步會完成）。

