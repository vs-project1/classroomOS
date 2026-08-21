import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import { attendance } from "../../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Testing insert...");
  try {
    await db.insert(attendance).values({
      id: "att_sess_002_std_niraj",
      classSessionId: "sess_002",
      studentId: "std_niraj_05",
      status: "present"
    });
    console.log("Insert SUCCESS!");
    // delete it
    await db.delete(attendance).where(eq(attendance.id, "att_sess_002_std_niraj"));
    console.log("Delete SUCCESS!");
  } catch (err) {
    console.error("Insert FAILED:", err);
  }
}

main().catch(console.error);
