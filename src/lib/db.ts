import { Pool, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | null = null;

/** True when OCI Postgres env vars are set (local dev can skip DB). */
export function isDbConfigured(): boolean {
  return Boolean(
    process.env.OCI_DB_HOST?.trim() &&
      process.env.OCI_DB_NAME?.trim() &&
      process.env.OCI_DB_USER?.trim()
  );
}

function getPool(): Pool {
  if (!isDbConfigured()) {
    throw new Error("OCI database is not configured (missing OCI_DB_* env vars)");
  }

  if (!pool) {
    pool = new Pool({
      host: process.env.OCI_DB_HOST,
      port: parseInt(process.env.OCI_DB_PORT || "5432", 10),
      database: process.env.OCI_DB_NAME,
      user: process.env.OCI_DB_USER,
      password: process.env.OCI_DB_PASSWORD,
      ssl: false,
    });

    pool.query(`
  ALTER TABLE shared_cards 
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;

  CREATE TABLE IF NOT EXISTS user_favorite_flowers (
    user_id TEXT NOT NULL,
    flower_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, flower_id)
  );
`).catch((err) => {
  console.error('Failed to run schema migrations:', err);
});
  }

  return pool;
}

export function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<R>> {
  return getPool().query<R>(text, params);
}
