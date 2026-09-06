import "server-only";
import { db } from "@/db";
import { telegramSettings, semesterTelegramConfigs, telegramBroadcastLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getTelegramSettings() {
  const [settings] = await db.select().from(telegramSettings).limit(1);
  return settings ?? null;
}

export async function getSemesterTelegramConfigs() {
  return db.select().from(semesterTelegramConfigs);
}

export async function getSemesterTelegramConfig(semester: string) {
  const [config] = await db
    .select()
    .from(semesterTelegramConfigs)
    .where(eq(semesterTelegramConfigs.semester, semester))
    .limit(1);
  return config ?? null;
}

export async function getTelegramBroadcastLogs(limit = 25) {
  return db.query.telegramBroadcastLogs.findMany({
    orderBy: [desc(telegramBroadcastLogs.createdAt)],
    limit,
    with: {
      sender: true,
    },
  });
}
