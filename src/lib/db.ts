import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.OCI_DB_HOST,
  port: parseInt(process.env.OCI_DB_PORT || '5432'),
  database: process.env.OCI_DB_NAME,
  user: process.env.OCI_DB_USER,
  password: process.env.OCI_DB_PASSWORD,
  ssl: false, // 暫時關閉 SSL，視伺服器設定而定
});

// Self-healing schema migration to ensure is_public, like_count, and comments columns exist
pool.query(`
  ALTER TABLE shared_cards 
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
`).catch((err) => {
  console.error('Failed to run schema migrations:', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
