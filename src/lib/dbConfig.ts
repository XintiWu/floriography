/** True when OCI Postgres env vars are set (local dev can skip DB). */
export function isDbConfigured(): boolean {
  return Boolean(
    process.env.OCI_DB_HOST?.trim() &&
      process.env.OCI_DB_NAME?.trim() &&
      process.env.OCI_DB_USER?.trim()
  );
}
