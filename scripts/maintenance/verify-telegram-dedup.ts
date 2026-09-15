import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function main() {
  const { db } = await import("../../src/db/client");
  const { telegramBroadcastLogs } = await import("../../src/db/schema");
  const { eq, and } = await import("drizzle-orm");
  const crypto = (await import("crypto")).default;

  console.log("🧪 Testing atomic deduplication unique constraint on telegram_broadcast_logs...");
  const testDate = "2099-01-01";
  const testSemester = "Test Sem";
  const testType = "morning_brief";

  // Clean up any test records
  await db.delete(telegramBroadcastLogs).where(
    and(
      eq(telegramBroadcastLogs.semester, testSemester),
      eq(telegramBroadcastLogs.type, testType),
      eq(telegramBroadcastLogs.date, testDate)
    )
  );

  // 1. First insert should succeed
  await db.insert(telegramBroadcastLogs).values({
    id: crypto.randomUUID(),
    semester: testSemester,
    type: testType,
    date: testDate,
    messageText: "Test text 1",
    status: "pending",
  });
  console.log("✅ 1. First reservation insert succeeded.");

  // 2. Second concurrent insert with same (semester, type, date) MUST fail
  let caughtError = false;
  try {
    await db.insert(telegramBroadcastLogs).values({
      id: crypto.randomUUID(),
      semester: testSemester,
      type: testType,
      date: testDate,
      messageText: "Test text 2",
      status: "pending",
    });
  } catch (err: any) {
    caughtError = true;
    console.log("✅ 2. Second reservation insert rejected by unique constraint as expected:", err.message);
  }

  if (!caughtError) {
    throw new Error("FAILED: Second insert should have thrown unique constraint error!");
  }

  // 3. Null date inserts (ad-hoc messages) should NOT conflict
  await db.insert(telegramBroadcastLogs).values({
    id: crypto.randomUUID(),
    semester: testSemester,
    type: "test_message",
    date: null,
    messageText: "Ad-hoc 1",
    status: "success",
  });
  await db.insert(telegramBroadcastLogs).values({
    id: crypto.randomUUID(),
    semester: testSemester,
    type: "test_message",
    date: null,
    messageText: "Ad-hoc 2",
    status: "success",
  });
  console.log("✅ 3. Multiple null date ad-hoc broadcasts coexist without unique constraint conflict.");

  // Clean up
  await db.delete(telegramBroadcastLogs).where(eq(telegramBroadcastLogs.semester, testSemester));
  console.log("✅ 4. All test data cleaned up successfully.");
  console.log("🎉 Atomic deduplication verified!");
}

main().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
