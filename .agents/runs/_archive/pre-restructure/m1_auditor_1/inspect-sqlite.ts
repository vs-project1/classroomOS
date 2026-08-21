import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const tables = await db.all(sql`SELECT name, sql FROM sqlite_master WHERE type='table' OR type='index'`);
  for (const t of tables) {
    console.log(`=== ${t.name} ===`);
    console.log(t.sql);
  }
}

main().catch(console.error);
