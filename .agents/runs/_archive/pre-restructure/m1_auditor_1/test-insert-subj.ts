import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import { subjects } from "../../src/db/schema";

async function main() {
  try {
    await db.insert(subjects).values({
      id: "subj_dbms",
      name: "Database Management System",
      code: "CACS251",
      teacherId: "tch_rajesh_01",
    });
  } catch (e: any) {
    console.error("Full error:", e);
    console.error("Cause:", e.cause);
  }
}

main().catch(console.error);
