import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createClient } from "@libsql/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const client = createClient({
  url: databaseUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
  console.log("🚀 Checking semester_telegram_configs columns...");

  const tableInfo = await client.execute("PRAGMA table_info(semester_telegram_configs)");
  const columns = tableInfo.rows.map((r) => r.name as string);

  if (!columns.includes("last_routine_modified_at")) {
    console.log("➕ Adding column 'last_routine_modified_at'...");
    await client.execute("ALTER TABLE semester_telegram_configs ADD COLUMN last_routine_modified_at INTEGER");
    console.log("✅ Added last_routine_modified_at.");
  } else {
    console.log("ℹ️ Column last_routine_modified_at already exists.");
  }

  if (!columns.includes("last_routine_published_at")) {
    console.log("➕ Adding column 'last_routine_published_at'...");
    await client.execute("ALTER TABLE semester_telegram_configs ADD COLUMN last_routine_published_at INTEGER");
    console.log("✅ Added last_routine_published_at.");
  } else {
    console.log("ℹ️ Column last_routine_published_at already exists.");
  }

  console.log("🎉 Migration finished successfully!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
