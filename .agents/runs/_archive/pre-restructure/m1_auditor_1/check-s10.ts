import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import { classSessions } from "../../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const sess = await db.select().from(classSessions);
  console.log("Total classSessions in DB:", sess.length);
  console.log("Session IDs:", sess.map(s => s.id));
  const s10 = await db.select().from(classSessions).where(eq(classSessions.id, "sess_010"));
  console.log("sess_010 record:", s10);
}

main().catch(console.error);
