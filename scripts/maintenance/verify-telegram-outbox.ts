import { config } from "dotenv";
config({ path: ".env.local" });
config();

// Stub 'server-only' for Node standalone tsx execution
try {
  const resolved = require.resolve("server-only");
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: {},
  } as any;
} catch {}

import { eq, like, and, inArray } from "drizzle-orm";

async function main() {
  console.log("🚀 [Test Suite] Starting P2 Telegram Outbox Verification...\n");

  const { db } = await import("../../src/db/client");
  const { telegramOutbox, telegramBroadcastLogs, telegramSettings } = await import("../../src/db/schema");
  const { sql } = await import("drizzle-orm");
  const {
    enqueueTelegramMessage,
    enqueueTelegramBatch,
    drainTelegramOutbox,
    calculateExponentialBackoff,
    getTelegramOutboxStats,
  } = await import("../../src/features/telegram/services/telegram-outbox-service");

  // Ensure WAL mode and busy timeout for test concurrency
  await db.run(sql`PRAGMA journal_mode = WAL;`);
  await db.run(sql`PRAGMA busy_timeout = 5000;`);

  // Snapshot original settings to ensure zero side-effects on real local/production config
  const [originalSettings] = await db.select().from(telegramSettings).limit(1);
  const createdDummySettings = !originalSettings;

  if (createdDummySettings) {
    await db.insert(telegramSettings).values({
      id: "verify-test-settings-id",
      botToken: "verify_test_token_12345",
      isEnabled: true,
      cronSecret: "verify_secret_12345",
    });
  }

  try {
    // Cleanup past verification test rows
    await db.delete(telegramOutbox).where(like(telegramOutbox.chatId, "verify-test-%"));
    await db.delete(telegramBroadcastLogs).where(like(telegramBroadcastLogs.messageText, "%[verify-test]%"));

    // -------------------------------------------------------------
    // Test 1: Exponential Backoff Formula
    // -------------------------------------------------------------
    console.log("🧪 Test 1: Exponential Backoff Mathematical Calculation...");
    const b0 = calculateExponentialBackoff(0);
    const b1 = calculateExponentialBackoff(1);
    const b2 = calculateExponentialBackoff(2);
    const b3 = calculateExponentialBackoff(3);
    const b4 = calculateExponentialBackoff(4);
    const b10 = calculateExponentialBackoff(10);
    const bNeg = calculateExponentialBackoff(-1);

    if (b0 !== 1000) throw new Error(`Backoff(0) expected 1000ms, got ${b0}`);
    if (b1 !== 2000) throw new Error(`Backoff(1) expected 2000ms, got ${b1}`);
    if (b2 !== 4000) throw new Error(`Backoff(2) expected 4000ms, got ${b2}`);
    if (b3 !== 8000) throw new Error(`Backoff(3) expected 8000ms, got ${b3}`);
    if (b4 !== 16000) throw new Error(`Backoff(4) expected 16000ms, got ${b4}`);
    if (b10 !== 300000) throw new Error(`Backoff(10) expected 300000ms (5min cap), got ${b10}`);
    if (bNeg !== 1000) throw new Error(`Backoff(-1) expected 1000ms safe floor, got ${bNeg}`);
    console.log("  ✅ Formula matches min(300000, 1000 * 2^retryCount) with safe floors across all orders.\n");

    // -------------------------------------------------------------
    // Test 2: Single Enqueue
    // -------------------------------------------------------------
    console.log("🧪 Test 2: Single Outbox Enqueue & Persistence...");
    const single = await enqueueTelegramMessage({
      chatId: "verify-test-single",
      text: "[verify-test] Single message payload",
      pinMessage: false,
      metadata: { semester: 1, type: "routine_broadcast" },
      maxRetries: 5,
      triggerDrain: false,
    });

    const [singleRow] = await db
      .select()
      .from(telegramOutbox)
      .where(eq(telegramOutbox.id, single.id));

    if (!singleRow) throw new Error("Single outbox row was not saved in DB!");
    if (singleRow.status !== "pending") throw new Error(`Expected pending status, got ${singleRow.status}`);
    if (singleRow.retryCount !== 0) throw new Error(`Expected retryCount=0, got ${singleRow.retryCount}`);
    if (singleRow.maxRetries !== 5) throw new Error(`Expected maxRetries=5, got ${singleRow.maxRetries}`);
    console.log("  ✅ Single message enqueued with status='pending', retryCount=0.\n");

    // -------------------------------------------------------------
    // Test 3: Batch Enqueue
    // -------------------------------------------------------------
    console.log("🧪 Test 3: Atomic Batch Outbox Enqueue...");
    const batch = await enqueueTelegramBatch([
      {
        chatId: "verify-test-batch-1",
        text: "[verify-test] Batch 1 payload",
        metadata: { semester: 1, type: "notice_broadcast" },
      },
      {
        chatId: "verify-test-batch-2",
        text: "[verify-test] Batch 2 payload",
        metadata: { semester: 2, type: "notice_broadcast" },
      },
      {
        chatId: "verify-test-batch-3",
        text: "[verify-test] Batch 3 payload",
        metadata: { semester: 3, type: "notice_broadcast" },
      },
    ], { triggerDrain: false });

    if (batch.ids.length !== 3) throw new Error(`Expected 3 batch IDs, got ${batch.ids.length}`);

    const batchRows = await db
      .select()
      .from(telegramOutbox)
      .where(like(telegramOutbox.chatId, "verify-test-batch-%"));

    if (batchRows.length !== 3) throw new Error(`Expected 3 batch rows in DB, found ${batchRows.length}`);
    for (const row of batchRows) {
      if (row.status !== "pending") throw new Error(`Row ${row.id} expected pending, got ${row.status}`);
    }
    console.log("  ✅ Atomically inserted 3 messages in batch with status='pending'.\n");

    // -------------------------------------------------------------
    // Test 4: Drain Worker & Completed Transition
    // -------------------------------------------------------------
    console.log("🧪 Test 4: Drain Worker Success & Status Transition...");
    const drainSuccess = await drainTelegramOutbox({
      botToken: "mock_token_success",
      batchSize: 10,
      mockSendFn: async () => ({
        ok: true,
        messageId: 8888,
      }),
    });

    if (drainSuccess.succeeded < 4) {
      throw new Error(`Expected at least 4 successful deliveries, got ${drainSuccess.succeeded}`);
    }

    const [completedSingle] = await db
      .select()
      .from(telegramOutbox)
      .where(eq(telegramOutbox.id, single.id));

    if (completedSingle.status !== "completed") {
      throw new Error(`Expected completed status for job ${single.id}, got ${completedSingle.status}`);
    }
    if (!completedSingle.processedAt) {
      throw new Error("processedAt was not populated on completed job!");
    }

    // Verify delivery log recorded in telegramBroadcastLogs
    const [logEntry] = await db
      .select()
      .from(telegramBroadcastLogs)
      .where(eq(telegramBroadcastLogs.messageText, "[verify-test] Single message payload"));

    if (!logEntry || logEntry.status !== "success") {
      throw new Error("Expected success log in telegram_broadcast_logs for outbox delivery!");
    }
    console.log("  ✅ Jobs transitioned to status='completed' and recorded in telegram_broadcast_logs.\n");

    // -------------------------------------------------------------
    // Test 5: Exponential Backoff Retry Scheduling
    // -------------------------------------------------------------
    console.log("🧪 Test 5: Error Backoff & Retry Scheduling...");
    const failJob = await enqueueTelegramMessage({
      chatId: "verify-test-fail-retry",
      text: "[verify-test] Network failure retry payload",
      maxRetries: 4,
      triggerDrain: false,
    });

    const drainFail = await drainTelegramOutbox({
      botToken: "mock_token_fail",
      batchSize: 10,
      mockSendFn: async () => ({
        ok: false,
        statusCode: 503,
        error: "503 Service Unavailable: Telegram Server Busy",
      }),
    });

    if (drainFail.retried !== 1) {
      throw new Error(`Expected 1 retried job, got ${drainFail.retried}`);
    }

    const [retriedJob] = await db
      .select()
      .from(telegramOutbox)
      .where(eq(telegramOutbox.id, failJob.id));

    if (retriedJob.status !== "pending") {
      throw new Error(`Expected status='pending' after retry, got ${retriedJob.status}`);
    }
    if (retriedJob.retryCount !== 1) {
      throw new Error(`Expected retryCount=1, got ${retriedJob.retryCount}`);
    }
    if (!retriedJob.lastError?.includes("503 Service Unavailable")) {
      throw new Error(`Expected lastError to capture error, got ${retriedJob.lastError}`);
    }
    const nowMs = Date.now();
    const nextAttemptMs = retriedJob.nextAttemptAt.getTime();
    const diffSec = Math.round((nextAttemptMs - nowMs) / 1000);
    if (diffSec < 0 || diffSec > 3) {
      throw new Error(`Expected nextAttemptAt ~1s in future, diff was ${diffSec}s (${nextAttemptMs - nowMs}ms)`);
    }
    console.log(`  ✅ Failure rescheduled with retryCount=1, nextAttemptAt in ~${diffSec}s, error captured.\n`);

    // -------------------------------------------------------------
    // Test 6: Rate Limiting (HTTP 429) Retry-After Backoff
    // -------------------------------------------------------------
    console.log("🧪 Test 6: HTTP 429 Rate Limit Handling (retry_after)...");
    const rateLimitJob = await enqueueTelegramMessage({
      chatId: "verify-test-429",
      text: "[verify-test] 429 Rate Limited payload",
      maxRetries: 5,
      triggerDrain: false,
    });

    const drain429 = await drainTelegramOutbox({
      botToken: "mock_token_429",
      batchSize: 10,
      mockSendFn: async () => ({
        ok: false,
        statusCode: 429,
        retryAfter: 9,
        error: "Too Many Requests: retry after 9",
      }),
    });

    if (drain429.retried !== 1) {
      throw new Error(`Expected 1 retried job on 429, got ${drain429.retried}`);
    }

    const [rateLimitedRow] = await db
      .select()
      .from(telegramOutbox)
      .where(eq(telegramOutbox.id, rateLimitJob.id));

    if (rateLimitedRow.status !== "pending") {
      throw new Error(`Expected status='pending', got ${rateLimitedRow.status}`);
    }
    if (rateLimitedRow.retryCount !== 1) {
      throw new Error(`Expected retryCount=1, got ${rateLimitedRow.retryCount}`);
    }
    const diff429Sec = Math.round((rateLimitedRow.nextAttemptAt.getTime() - Date.now()) / 1000);
    if (diff429Sec < 7 || diff429Sec > 11) {
      throw new Error(`Expected nextAttemptAt ~9s in future from retry_after=9, got diff ${diff429Sec}s`);
    }
    console.log(`  ✅ HTTP 429 parsed retry_after=9s correctly (scheduled in ~${diff429Sec}s).\n`);

    // -------------------------------------------------------------
    // Test 7: Max Retries Exhaustion -> 'failed' Status
    // -------------------------------------------------------------
    console.log("🧪 Test 7: Max Retries Exhaustion & Final Failure Transition...");
    const exhaustJob = await enqueueTelegramMessage({
      chatId: "verify-test-exhaust",
      text: "[verify-test] Exhaust payload",
      maxRetries: 2,
      triggerDrain: false,
    });

    // Attempt 1: Fails -> retryCount = 1
    await drainTelegramOutbox({
      botToken: "mock_token_exhaust",
      mockSendFn: async () => ({ ok: false, statusCode: 500, error: "Simulated Fatal Drop" }),
    });

    // Force nextAttemptAt to now so worker can claim it again
    await db
      .update(telegramOutbox)
      .set({ nextAttemptAt: new Date(Date.now() - 1000) })
      .where(eq(telegramOutbox.id, exhaustJob.id));

    // Attempt 2: Fails -> retryCount = 2 >= maxRetries -> status: 'failed'
    const exhaustDrain2 = await drainTelegramOutbox({
      botToken: "mock_token_exhaust",
      mockSendFn: async () => ({ ok: false, statusCode: 500, error: "Simulated Fatal Drop" }),
    });

    if (exhaustDrain2.failed !== 1) {
      throw new Error(`Expected 1 failed job on retry exhaustion, got ${exhaustDrain2.failed}`);
    }

    const [exhaustedRow] = await db
      .select()
      .from(telegramOutbox)
      .where(eq(telegramOutbox.id, exhaustJob.id));

    if (exhaustedRow.status !== "failed") {
      throw new Error(`Expected status='failed', got ${exhaustedRow.status}`);
    }
    if (exhaustedRow.retryCount !== 2) {
      throw new Error(`Expected retryCount=2, got ${exhaustedRow.retryCount}`);
    }
    if (!exhaustedRow.processedAt) {
      throw new Error("Expected processedAt to be set when job transitioned to failed!");
    }

    // Verify failure log recorded in telegramBroadcastLogs
    const [failLogEntry] = await db
      .select()
      .from(telegramBroadcastLogs)
      .where(eq(telegramBroadcastLogs.messageText, "[verify-test] Exhaust payload"));

    if (!failLogEntry || failLogEntry.status !== "failed") {
      throw new Error("Expected failed log in telegram_broadcast_logs for exhausted job!");
    }
    console.log("  ✅ Job transitioned to status='failed' after exceeding maxRetries, logged to DB.\n");

    // -------------------------------------------------------------
    // Test 8: Aggregated Queue Stats
    // -------------------------------------------------------------
    console.log("🧪 Test 8: Aggregated Outbox Queue Statistics...");
    const stats = await getTelegramOutboxStats();

    if (typeof stats.pending !== "number" || stats.pending < 0) throw new Error("Invalid stats.pending");
    if (typeof stats.processing !== "number" || stats.processing < 0) throw new Error("Invalid stats.processing");
    if (typeof stats.completed !== "number" || stats.completed < 0) throw new Error("Invalid stats.completed");
    if (typeof stats.failed !== "number" || stats.failed < 0) throw new Error("Invalid stats.failed");
    if (stats.total !== stats.pending + stats.processing + stats.completed + stats.failed) {
      throw new Error(`Stats mismatch: total ${stats.total} != sum of statuses`);
    }
    console.log("  📊 Current Queue Stats:", stats);
    console.log("  ✅ Outbox stats computed via SQL aggregation successfully.\n");

    // -------------------------------------------------------------
    // Test 9: Active Drain Concurrency & Non-Starvation
    // -------------------------------------------------------------
    console.log("🧪 Test 9: Active Drain Concurrency & Non-Starvation Loop...");
    const slowJob1 = await enqueueTelegramMessage({
      chatId: "verify-test-slow-1",
      text: "[verify-test] Slow Job 1",
      triggerDrain: false,
    });

    // Start draining slowJob1 with a 150ms delay per job
    const drainPromise = drainTelegramOutbox({
      botToken: "mock_token_concurrent",
      batchSize: 5,
      mockSendFn: async () => {
        await new Promise((r) => setTimeout(r, 150));
        return { ok: true, messageId: 9991 };
      },
    });

    // While slowJob1 is actively draining, enqueue slowJob2
    await new Promise((r) => setTimeout(r, 50));
    const slowJob2 = await enqueueTelegramMessage({
      chatId: "verify-test-slow-2",
      text: "[verify-test] Slow Job 2 Enqueued Mid-Drain",
      triggerDrain: true, // triggers drain while worker is already running
    });

    await drainPromise;

    const [j1Row] = await db.select().from(telegramOutbox).where(eq(telegramOutbox.id, slowJob1.id));
    const [j2Row] = await db.select().from(telegramOutbox).where(eq(telegramOutbox.id, slowJob2.id));

    if (j1Row.status !== "completed") {
      throw new Error(`Expected Job 1 to be completed, got ${j1Row.status}`);
    }
    if (j2Row.status !== "completed") {
      throw new Error(`Expected Job 2 (enqueued mid-drain) to be completed via drain loop, got ${j2Row.status}`);
    }
    console.log("  ✅ Mid-drain enqueued job was cleanly claimed and completed without starvation.\n");

    // -------------------------------------------------------------
    // Test 10: Circuit Breaker on HTTP 429 Batch (No Retry Burn)
    // -------------------------------------------------------------
    console.log("🧪 Test 10: Circuit Breaker on HTTP 429 Batch Deferral...");
    const cbJobs = await enqueueTelegramBatch([
      { chatId: "verify-test-cb-1", text: "[verify-test] CB 1 (Will 429)" },
      { chatId: "verify-test-cb-2", text: "[verify-test] CB 2 (Should Defer)" },
      { chatId: "verify-test-cb-3", text: "[verify-test] CB 3 (Should Defer)" },
    ], { triggerDrain: false });

    let sendCallCount = 0;
    const drainCB = await drainTelegramOutbox({
      botToken: "mock_token_cb",
      batchSize: 10,
      mockSendFn: async () => {
        sendCallCount++;
        return {
          ok: false,
          statusCode: 429,
          retryAfter: 15,
          error: "Too Many Requests: retry after 15",
        };
      },
    });

    if (sendCallCount !== 1) {
      throw new Error(`Expected exactly 1 external call before circuit breaker tripped, got ${sendCallCount}`);
    }

    const [cb1] = await db.select().from(telegramOutbox).where(eq(telegramOutbox.id, cbJobs.ids[0]));
    const [cb2] = await db.select().from(telegramOutbox).where(eq(telegramOutbox.id, cbJobs.ids[1]));
    const [cb3] = await db.select().from(telegramOutbox).where(eq(telegramOutbox.id, cbJobs.ids[2]));

    // CB1 was attempted: retryCount should be 1
    if (cb1.status !== "pending" || cb1.retryCount !== 1) {
      throw new Error(`Expected CB1 status=pending with retryCount=1, got ${cb1.status}, retries=${cb1.retryCount}`);
    }
    // CB2 and CB3 were NOT attempted: retryCount must remain 0!
    if (cb2.status !== "pending" || cb2.retryCount !== 0) {
      throw new Error(`Expected CB2 to defer with retryCount=0, got retries=${cb2.retryCount}`);
    }
    if (cb3.status !== "pending" || cb3.retryCount !== 0) {
      throw new Error(`Expected CB3 to defer with retryCount=0, got retries=${cb3.retryCount}`);
    }
    console.log("  ✅ Circuit breaker stopped API bombardment: remaining batch deferred with retryCount=0 preserved.\n");

    // -------------------------------------------------------------
    // Test 11: Foreign Key & Check Constraint Robustness in Logging
    // -------------------------------------------------------------
    console.log("🧪 Test 11: Foreign Key & Check Constraint Defensive Logging...");
    const robustJob = await enqueueTelegramMessage({
      chatId: "verify-test-robust",
      text: "[verify-test] Robust logging payload",
      metadata: {
        semester: 99, // Outside 1..8 check constraint
        sentByUserId: "00000000-0000-0000-0000-000000000000", // Non-existent user UUID
        type: "notice_broadcast",
      },
      triggerDrain: false,
    });

    const robustDrain = await drainTelegramOutbox({
      botToken: "mock_token_robust",
      mockSendFn: async () => ({ ok: true, messageId: 7777 }),
    });

    if (robustDrain.succeeded !== 1) {
      throw new Error(`Expected robust job to succeed, got ${robustDrain.succeeded}`);
    }

    const [robustRow] = await db.select().from(telegramOutbox).where(eq(telegramOutbox.id, robustJob.id));
    if (robustRow.status !== "completed") {
      throw new Error(`Expected robust job status=completed, got ${robustRow.status}`);
    }
    console.log("  ✅ Out of range semester and invalid foreign key handled gracefully without crashing worker.\n");

    // -------------------------------------------------------------
    // Test 12: Input Validation Rejection
    // -------------------------------------------------------------
    console.log("🧪 Test 12: Input Validation Guards on Enqueue...");
    let caughtEmptyChat = false;
    try {
      await enqueueTelegramMessage({ chatId: "   ", text: "valid text", triggerDrain: false });
    } catch {
      caughtEmptyChat = true;
    }
    if (!caughtEmptyChat) throw new Error("Expected enqueue to reject whitespace chatId!");

    let caughtEmptyText = false;
    try {
      await enqueueTelegramMessage({ chatId: "valid_chat", text: "   ", triggerDrain: false });
    } catch {
      caughtEmptyText = true;
    }
    if (!caughtEmptyText) throw new Error("Expected enqueue to reject whitespace text!");

    console.log("  ✅ Input validation guards correctly reject empty or blank payloads.\n");

    // Cleanup test artifacts
    await db.delete(telegramOutbox).where(like(telegramOutbox.chatId, "verify-test-%"));
    await db.delete(telegramBroadcastLogs).where(like(telegramBroadcastLogs.messageText, "%[verify-test]%"));
    console.log("🧹 Cleaned up all verification test records.\n");

    console.log("🎉 ALL 12 OUTBOX VERIFICATION SUITES PASSED WITH 100% SUCCESS!");
  } finally {
    // Restore or remove dummy settings created during testing
    if (createdDummySettings) {
      await db.delete(telegramSettings).where(eq(telegramSettings.id, "verify-test-settings-id"));
    }
  }
}

main().catch((err) => {
  console.error("❌ Outbox verification failed with error:", err);
  process.exit(1);
});
