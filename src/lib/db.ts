import type { Pool, QueryResult, QueryResultRow } from "pg";
import { isDbConfigured } from "@/lib/dbConfig";

export { isDbConfigured } from "@/lib/dbConfig";

let pool: Pool | null = null;

async function getPool(): Promise<Pool> {
  if (!isDbConfigured()) {
    throw new Error("OCI database is not configured (missing OCI_DB_* env vars)");
  }

  if (!pool) {
    const { Pool: PgPool } = await import("pg");
    pool = new PgPool({
      host: process.env.OCI_DB_HOST,
      port: parseInt(process.env.OCI_DB_PORT || "5432", 10),
      database: process.env.OCI_DB_NAME,
      user: process.env.OCI_DB_USER,
      password: process.env.OCI_DB_PASSWORD,
      ssl: false,
    });

    pool
      .query(`
        ALTER TABLE shared_cards 
        ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
      `)
      .catch((err) => {
        console.error("Failed to run schema migrations:", err);
      });
  }

  return pool;
}

export async function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<R>> {
  const client = await getPool();
  return client.query<R>(text, params);
}
