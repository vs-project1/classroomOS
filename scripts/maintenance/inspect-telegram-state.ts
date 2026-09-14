import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const { db } = await import("../../src/db/client");
  const { telegramSettings, semesterTelegramConfigs, telegramBroadcastLogs } = await import("../../src/db/schema");
  const { desc } = await import("drizzle-orm");
  console.log("=== TELEGRAM SETTINGS ===");
  const settings = await db.select().from(telegramSettings);
  console.log(JSON.stringify(settings, null, 2));

  console.log("\n=== SEMESTER TELEGRAM CONFIGS ===");
  const configs = await db.select().from(semesterTelegramConfigs);
  console.log(JSON.stringify(configs, null, 2));

  console.log("\n=== RECENT TELEGRAM BROADCAST LOGS ===");
  const logs = await db
    .select()
    .from(telegramBroadcastLogs)
    .orderBy(desc(telegramBroadcastLogs.createdAt))
    .limit(20);
  console.log(JSON.stringify(logs, null, 2));

  console.log("\n=== WEEKLY ROUTINE DAYS IN DB ===");
  const { weeklyRoutine } = await import("../../src/db/schema");
  const routines = await db.select().from(weeklyRoutine);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const counts: Record<string, number> = {};
  for (const r of routines) {
    const d = dayNames[r.dayOfWeek] || `Day ${r.dayOfWeek}`;
    counts[d] = (counts[d] || 0) + 1;
  }
  console.log(counts);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error inspecting telegram state:", err);
    process.exit(1);
  });
