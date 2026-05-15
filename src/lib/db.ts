import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.OCI_DB_HOST,
  port: parseInt(process.env.OCI_DB_PORT || '5432'),
  database: process.env.OCI_DB_NAME,
  user: process.env.OCI_DB_USER,
  password: process.env.OCI_DB_PASSWORD,
  ssl: false, // 暫時關閉 SSL，視伺服器設定而定
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
