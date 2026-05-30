const { Client } = require("pg");

async function main() {
  const c = new Client({
    host: process.env.OCI_DB_HOST,
    port: Number(process.env.OCI_DB_PORT || 5432),
    database: process.env.OCI_DB_NAME,
    user: process.env.OCI_DB_USER,
    password: process.env.OCI_DB_PASSWORD,
    ssl: false,
  });

  await c.connect();
  const now = await c.query("select now() as now");
  console.log("OK", now.rows[0].now);

  const designs = await c.query("select count(*)::int as n from designs");
  console.log("designs", designs.rows[0].n);

  const assets = await c.query(
    "select count(*)::int as n from assets where type = 'flower' and is_active = true"
  );
  console.log("assets(flowers)", assets.rows[0].n);

  const byType = await c.query(
    "select type, count(*)::int as n from assets group by type order by n desc"
  );
  console.log("assets by type", byType.rows);

  await c.end();
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});

