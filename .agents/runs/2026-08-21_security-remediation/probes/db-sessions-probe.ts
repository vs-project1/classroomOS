import { createClient } from "@libsql/client";

async function main() {
  const client = createClient({ url: "file:local.db" });

  const t = await client.execute(
    "SELECT name FROM sqlite_master WHERE name='sessions'"
  );
  console.log("SQLITE_MASTER sessions:", JSON.stringify(t.rows));

  const info = await client.execute("PRAGMA table_info(sessions)");
  console.log("TABLE_INFO(sessions):");
  for (const r of info.rows) {
    console.log(
      `  cid=${r.cid} name=${r.name} type=${r.type} notnull=${r.notnull} dflt=${r.dflt_value} pk=${r.pk}`
    );
  }

  const known = await client.execute({
    sql: "SELECT id, user_id, expires_at, typeof(expires_at) AS t, created_at, typeof(created_at) AS ct FROM sessions WHERE id LIKE 'ec8c7187%'",
  });
  console.log("KNOWN_ROW(ec8c7187…):", JSON.stringify(known.rows));

  const all = await client.execute(
    "SELECT id, user_id, expires_at, typeof(expires_at) AS t FROM sessions ORDER BY expires_at DESC LIMIT 10"
  );
  console.log("RECENT_ROWS:");
  for (const r of all.rows) {
    const expSec = Number(r.expires_at);
    const expMs = expSec * 1000;
    console.log(
      `  id=${String(r.id).slice(0, 12)}… user=${r.user_id} expires_at=${expSec} (${typeof expSec}, ${new Date(expMs).toISOString()}) typeof=${r.t}`
    );
  }

  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
