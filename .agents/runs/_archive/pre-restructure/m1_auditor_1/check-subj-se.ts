import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import { subjects } from "../../src/db/schema";

async function main() {
  const allSubjs = await db.select().from(subjects);
  console.log("Current subjects:", allSubjs);

  try {
    await db.insert(subjects).values({
      id: "subj_se",
      name: "Software Engineering",
      code: "CACS255",
      teacherId: "tch_rajesh_01",
    });
    console.log("Inserted subj_se successfully!");
  } catch (err: any) {
    console.error("Failed to insert subj_se:", err.message);
    if (err.cause) console.error("Cause:", err.cause);
  }
}

main().catch(console.error);
