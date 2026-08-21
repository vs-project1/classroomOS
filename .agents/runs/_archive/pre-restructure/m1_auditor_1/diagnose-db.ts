import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import { students, classSessions, weeklyRoutine } from "../../src/db/schema";

async function main() {
  const stds = await db.select().from(students);
  console.log("Students count:", stds.length);
  console.log("Students IDs:", stds.map(s => s.id));

  const sess = await db.select().from(classSessions);
  console.log("Sessions count:", sess.length);
  console.log("Sessions IDs (first 10):", sess.slice(0, 10).map(s => s.id));
}

main().catch(console.error);
