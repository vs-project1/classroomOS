import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const rows = await db.all(sql`SELECT * FROM subjects`);
  console.log("Raw SQL subjects query rows:", rows);
}

main().catch(console.error);
