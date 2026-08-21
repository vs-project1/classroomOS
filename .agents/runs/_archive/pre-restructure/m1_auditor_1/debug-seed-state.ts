import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import { attendance, classSessions, students } from "../../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Checking students in DB:");
  const stds = await db.select().from(students);
  console.log(stds.map(s => ({ id: s.id, name: s.name })));

  console.log("Checking class_sessions in DB:");
  const sessions = await db.select().from(classSessions);
  console.log("Total sessions:", sessions.length);
  console.log("sess_002 exists?:", sessions.some(s => s.id === "sess_002"));

  // Check if attendance already has rows
  const atts = await db.select().from(attendance);
  console.log("Attendance count:", atts.length);
  console.log("Attendance rows:", atts);
}

main().catch(console.error);
