import crypto from "crypto";
import { and, asc, count, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/db/client";
import {
  telegramOutbox,
  telegramSettings,
  telegramBroadcastLogs,
  semesterTelegramConfigs,
} from "@/db/schema";
import {
  sendTelegramMessage,
  type SendMessageOptions,
  type SendTelegramMessageResult,
} from "./telegram-client";

export type TelegramOutboxMetadata = {
  semester?: number;
  type?: string;
  noticeId?: string;
  sentByUserId?: string | null;
  [key: string]: any;
};

export type EnqueueTelegramJobInput = {
  chatId: string;
  messageThreadId?: number | null;
  text: string;
  pinMessage?: boolean;
  metadata?: TelegramOutboxMetadata;
  maxRetries?: number;
  nextAttemptAt?: Date;
  triggerDrain?: boolean;
};

export type DrainTelegramOutboxOptions = {
  batchSize?: number;
  botToken?: string;
  mockSendFn?: (options: SendMessageOptions) => Promise<SendTelegramMessageResult>;
};

export type TelegramOutboxStats = {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
};

/**
 * Calculates exponential backoff in milliseconds: min(300,000ms, 1000ms * 2^retryCount).
 */
export function calculateExponentialBackoff(retryCount: number): number {
  const safeCount = Math.max(0, retryCount);
  return Math.min(300_000, 1000 * Math.pow(2, safeCount));
}

let isDraining = false;
let hasPendingDrainRequest = false;

/**
 * Defensive logger for telegram broadcast logs that guarantees foreign key
 * and check constraint safety without crashing outbox workers.
 */
async function recordBroadcastLogDefensively({
  semester,
  type,
  text,
  status,
  errorMessage,
  sentByUserId,
}: {
  semester?: number;
  type: string;
  text: string;
  status: "success" | "failed";
  errorMessage?: string | null;
  sentByUserId?: string | null;
}): Promise<void> {
  const safeSemester =
    typeof semester === "number" && semester >= 1 && semester <= 8 ? semester : 1;

  try {
    await db.insert(telegramBroadcastLogs).values({
      id: crypto.randomUUID(),
      semester: safeSemester,
      type,
      messageText: text,
      status,
      errorMessage: errorMessage ?? null,
      sentByUserId: sentByUserId ?? null,
    });
  } catch (initialErr) {
    // If foreign key constraint failed on sentByUserId, retry with null user ID
    if (sentByUserId) {
      try {
        await db.insert(telegramBroadcastLogs).values({
          id: crypto.randomUUID(),
          semester: safeSemester,
          type,
          messageText: text,
          status,
          errorMessage: errorMessage ?? null,
          sentByUserId: null,
        });
        return;
      } catch {}
    }
    console.warn("[telegram-outbox] Failed to insert broadcast log entry:", initialErr);
  }
}

/**
 * Enqueues a single message into the Telegram outbox and triggers background drain.
 */
export async function enqueueTelegramMessage(
  job: EnqueueTelegramJobInput
): Promise<{ id: string }> {
  if (!job.chatId?.trim()) {
    throw new Error("Cannot enqueue Telegram message: chatId is required.");
  }
  if (!job.text?.trim()) {
    throw new Error("Cannot enqueue Telegram message: message text is required.");
  }

  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(telegramOutbox).values({
    id,
    chatId: job.chatId.trim(),
    messageThreadId: job.messageThreadId ?? null,
    text: job.text,
    pinMessage: job.pinMessage ?? false,
    status: "pending",
    retryCount: 0,
    maxRetries: job.maxRetries ?? 5,
    nextAttemptAt: job.nextAttemptAt ?? now,
    metadata: job.metadata ?? null,
    createdAt: now,
    updatedAt: now,
  });

  // Non-blocking trigger to drain outbox
  if (job.triggerDrain !== false) {
    void drainTelegramOutbox().catch((err) => {
      console.error("[telegram-outbox] Background drain trigger error:", err);
    });
  }

  return { id };
}

/**
 * Atomically enqueues a batch of messages into the Telegram outbox and triggers background drain.
 */
export async function enqueueTelegramBatch(
  jobs: EnqueueTelegramJobInput[],
  options?: { triggerDrain?: boolean }
): Promise<{ ids: string[] }> {
  if (jobs.length === 0) {
    return { ids: [] };
  }

  for (const job of jobs) {
    if (!job.chatId?.trim()) {
      throw new Error("Cannot enqueue Telegram batch: chatId is required for all jobs.");
    }
    if (!job.text?.trim()) {
      throw new Error("Cannot enqueue Telegram batch: message text is required for all jobs.");
    }
  }

  const now = new Date();
  const values = jobs.map((job) => ({
    id: crypto.randomUUID(),
    chatId: job.chatId.trim(),
    messageThreadId: job.messageThreadId ?? null,
    text: job.text,
    pinMessage: job.pinMessage ?? false,
    status: "pending" as const,
    retryCount: 0,
    maxRetries: job.maxRetries ?? 5,
    nextAttemptAt: job.nextAttemptAt ?? now,
    metadata: job.metadata ?? null,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(telegramOutbox).values(values);

  const ids = values.map((v) => v.id);

  // Non-blocking trigger to drain outbox
  if (options?.triggerDrain !== false) {
    void drainTelegramOutbox().catch((err) => {
      console.error("[telegram-outbox] Background batch drain trigger error:", err);
    });
  }

  return { ids };
}


type BatchDrainResult = {
  processed: number;
  succeeded: number;
  failed: number;
  retried: number;
  wasRateLimited: boolean;
};

async function drainSingleBatch(
  options: DrainTelegramOutboxOptions
): Promise<BatchDrainResult> {
  const batchSize = options.batchSize ?? 10;
  const now = new Date();

  // 1. Recover stale processing jobs older than 5 minutes
  const staleThreshold = new Date(now.getTime() - 5 * 60 * 1000);
  await db
    .update(telegramOutbox)
    .set({
      status: "pending",
      updatedAt: now,
    })
    .where(
      and(
        eq(telegramOutbox.status, "processing"),
        lte(telegramOutbox.updatedAt, staleThreshold)
      )
    );

  // 2. Select candidates whose nextAttemptAt <= now
  const candidates = await db
    .select({ id: telegramOutbox.id })
    .from(telegramOutbox)
    .where(
      and(
        eq(telegramOutbox.status, "pending"),
        lte(telegramOutbox.nextAttemptAt, now)
      )
    )
    .orderBy(asc(telegramOutbox.nextAttemptAt), asc(telegramOutbox.createdAt))
    .limit(batchSize);

  if (candidates.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, retried: 0, wasRateLimited: false };
  }

  const candidateIds = candidates.map((c) => c.id);
  // Atomically claim rows via returning()
  const claimedJobs = await db
    .update(telegramOutbox)
    .set({
      status: "processing",
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(telegramOutbox.id, candidateIds),
        eq(telegramOutbox.status, "pending")
      )
    )
    .returning();

  if (claimedJobs.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, retried: 0, wasRateLimited: false };
  }

  // 3. Resolve Telegram Bot token
  let resolvedToken = options.botToken?.trim();
  if (!resolvedToken) {
    const [settings] = await db.select().from(telegramSettings).limit(1);
    if (settings?.isEnabled && settings?.botToken) {
      resolvedToken = settings.botToken;
    }
  }

  if (!resolvedToken) {
    // Defer claimed jobs if bot token is not available or disabled
    const claimedIds = claimedJobs.map((j) => j.id);
    await db
      .update(telegramOutbox)
      .set({
        status: "pending",
        lastError: "Telegram Bot is not configured or is disabled in Settings",
        nextAttemptAt: new Date(Date.now() + 60_000),
        updatedAt: new Date(),
      })
      .where(inArray(telegramOutbox.id, claimedIds));

    return {
      processed: claimedJobs.length,
      succeeded: 0,
      failed: 0,
      retried: claimedJobs.length,
      wasRateLimited: false,
    };
  }

  const sendFn = options.mockSendFn || sendTelegramMessage;
  let succeeded = 0;
  let failed = 0;
  let retried = 0;
  let wasRateLimited = false;

  // 4. Process claimed jobs with inter-request pacing
  for (let i = 0; i < claimedJobs.length; i++) {
    const job = claimedJobs[i];

    // Pace requests: 50ms pause between external calls
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    let sendResult: SendTelegramMessageResult;
    try {
      sendResult = await sendFn({
        token: resolvedToken,
        chatId: job.chatId,
        text: job.text,
        messageThreadId: job.messageThreadId,
        pinMessage: Boolean(job.pinMessage),
      });
    } catch (err) {
      sendResult = {
        ok: false,
        statusCode: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const meta = job.metadata as TelegramOutboxMetadata | null;

    if (sendResult.ok) {
      // Transition to completed
      const processedAt = new Date();
      await db
        .update(telegramOutbox)
        .set({
          status: "completed",
          processedAt,
          updatedAt: processedAt,
          lastError: null,
        })
        .where(eq(telegramOutbox.id, job.id));

      // Record delivery log defensively
      await recordBroadcastLogDefensively({
        semester: meta?.semester,
        type: meta?.type ?? "routine_broadcast",
        text: job.text,
        status: "success",
        errorMessage: null,
        sentByUserId: meta?.sentByUserId,
      });

      // If routine broadcast succeeded, update lastRoutinePublishedAt
      if (meta?.type === "routine_broadcast" && meta?.semester) {
        await db
          .update(semesterTelegramConfigs)
          .set({
            lastRoutinePublishedAt: processedAt,
            updatedAt: processedAt,
          })
          .where(eq(semesterTelegramConfigs.semester, meta.semester));
      }

      succeeded++;
    } else {
      // Calculate backoff & retry
      const isRateLimit =
        sendResult.statusCode === 429 ||
        sendResult.retryAfter !== undefined ||
        /429|retry after/i.test(sendResult.error || "");

      let backoffMs: number;
      let lastError: string;

      if (isRateLimit) {
        const retryAfterSec = sendResult.retryAfter ?? 5;
        backoffMs = retryAfterSec * 1000;
        lastError =
          sendResult.error ||
          `Rate limited (HTTP 429). Retrying after ${retryAfterSec}s`;
      } else {
        backoffMs = calculateExponentialBackoff(job.retryCount);
        lastError = sendResult.error || "Failed to deliver Telegram message";
      }

      const nextRetryCount = job.retryCount + 1;
      const updatedAt = new Date();

      if (nextRetryCount >= job.maxRetries) {
        // Transition to failed
        await db
          .update(telegramOutbox)
          .set({
            status: "failed",
            retryCount: nextRetryCount,
            lastError,
            processedAt: updatedAt,
            updatedAt,
          })
          .where(eq(telegramOutbox.id, job.id));

        // Record failure defensively
        await recordBroadcastLogDefensively({
          semester: meta?.semester,
          type: meta?.type ?? "routine_broadcast",
          text: job.text,
          status: "failed",
          errorMessage: lastError,
          sentByUserId: meta?.sentByUserId,
        });

        failed++;
      } else {
        // Re-schedule current job for next attempt
        const nextAttemptAt = new Date(Date.now() + backoffMs);
        await db
          .update(telegramOutbox)
          .set({
            status: "pending",
            retryCount: nextRetryCount,
            nextAttemptAt,
            lastError,
            updatedAt,
          })
          .where(eq(telegramOutbox.id, job.id));

        retried++;
      }

      // Circuit Breaker on HTTP 429:
      // Return remaining unattempted jobs in this batch back to 'pending' without burning their retry count.
      if (isRateLimit) {
        wasRateLimited = true;
        const remainingJobs = claimedJobs.slice(i + 1);
        if (remainingJobs.length > 0) {
          const remainingIds = remainingJobs.map((rj) => rj.id);
          const resumeAt = new Date(Date.now() + backoffMs);
          await db
            .update(telegramOutbox)
            .set({
              status: "pending",
              nextAttemptAt: resumeAt,
              updatedAt: new Date(),
            })
            .where(inArray(telegramOutbox.id, remainingIds));
        }
        break; // Stop slamming the API during active cooldown
      }
    }
  }

  return {
    processed: claimedJobs.length,
    succeeded,
    failed,
    retried,
    wasRateLimited,
  };
}

/**
 * Worker function that drains pending outbox messages, respecting rate limits,
 * backoff policies, atomic claiming, and status transitions.
 */
export async function drainTelegramOutbox(
  options: DrainTelegramOutboxOptions = {}
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  retried: number;
}> {
  if (isDraining) {
    hasPendingDrainRequest = true;
    return { processed: 0, succeeded: 0, failed: 0, retried: 0 };
  }

  isDraining = true;
  const aggregate = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    retried: 0,
  };

  try {
    let loops = 0;
    const maxLoops = 10; // Guard against runaway batches in a single execution

    do {
      hasPendingDrainRequest = false;
      loops++;

      const batchResult = await drainSingleBatch(options);
      aggregate.processed += batchResult.processed;
      aggregate.succeeded += batchResult.succeeded;
      aggregate.failed += batchResult.failed;
      aggregate.retried += batchResult.retried;

      if (
        batchResult.processed === 0 ||
        batchResult.wasRateLimited ||
        loops >= maxLoops
      ) {
        break;
      }
    } while (hasPendingDrainRequest);

    return aggregate;
  } finally {
    isDraining = false;
  }
}

/**
 * Returns aggregated outbox counts for queue monitoring.
 */
export async function getTelegramOutboxStats(): Promise<TelegramOutboxStats> {
  const rows = await db
    .select({
      status: telegramOutbox.status,
      count: count(),
    })
    .from(telegramOutbox)
    .groupBy(telegramOutbox.status);

  const stats: TelegramOutboxStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0,
  };

  for (const r of rows) {
    const cnt = Number(r.count);
    if (r.status === "pending") stats.pending = cnt;
    else if (r.status === "processing") stats.processing = cnt;
    else if (r.status === "completed") stats.completed = cnt;
    else if (r.status === "failed") stats.failed = cnt;
    stats.total += cnt;
  }

  return stats;
}
