import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import { attendance } from "../../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const atts = await db.select().from(attendance);
  console.log("Total attendance rows in DB:", atts.length);
  console.log("Sample attendance rows:", atts.slice(0, 5));
}

main().catch(console.error);
