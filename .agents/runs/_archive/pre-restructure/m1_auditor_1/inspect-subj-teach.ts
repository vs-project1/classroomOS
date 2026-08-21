import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import { subjects, teachers } from "../../src/db/schema";

async function main() {
  console.log("Teachers in DB:", await db.select().from(teachers));
  console.log("Subjects in DB:", await db.select().from(subjects));
}

main().catch(console.error);
