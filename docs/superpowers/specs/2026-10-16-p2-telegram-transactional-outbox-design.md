# Specification: P2 Telegram Transactional Outbox & Resilient Delivery Engine

**Status:** APPROVED FOR IMPLEMENTATION  
**Author:** Classroom OS Core Architecture Team  
**Date:** October 16, 2026  
**Reference Invariant:** `docs/research/database-and-architectural-fixes.md` (Failure Point 1 & Matrix P2)

---

## 1. Problem Statement & Root Cause

Currently in Classroom OS, Telegram broadcasts (`broadcastRoutineToTelegramAction`, `broadcastNoticeToTelegramAction`, and test messages in [`src/features/telegram/actions/telegram-actions.ts`](file:///d:/CLASSROOM%20OS/src/features/telegram/actions/telegram-actions.ts)) make synchronous HTTP calls directly to the Telegram Bot API (`https://api.telegram.org`) from within Next.js Server Actions.

### Critical Vulnerabilities in Production:
1. **Network Lag & 504 Gateway Timeouts:** If Telegram's API experiences a latency spike (e.g. 3-8 seconds) or network glitch, the user's browser hangs on a loading spinner and frequently times out, even though the underlying routine or notice was already saved to SQLite.
2. **Sequential Multi-Semester Loop Latency:** Broadcasting an administrative notice to 8 semesters runs 8 sequential HTTP requests in a synchronous loop (`for (const semester of input.semesters) { await sendTelegramMessage(...) }`), compounding latency up to 10+ seconds.
3. **Telegram Rate Limits (HTTP 429):** Telegram enforces strict limits: 30 messages/second globally and 1 message/second per group. Fast manual broadcasts or burst notices trigger HTTP 429 drops without retry logic.
4. **Lack of Delivery Traceability:** Failed deliveries are lost or leave orphaned states without exponential backoff or recovery capability.

---

## 2. Proposed Architecture: Transactional Outbox Pattern

Following best practices from Canvas LMS (delayed jobs) and Moodle (task queue), Classroom OS will decouple **intent generation** from **external network delivery** using a database-backed **Transactional Outbox**.

```
[ User Request / Server Action ]
          │
          ▼
   ┌───────────────┐
   │ SQLite DB Tx  │ ── Writes business data (Routine, Notice)
   │               │ ── Writes outbox jobs with status: 'pending' (<5ms)
   └───────────────┘
          │
          ├─────────────────────────────────────────┐
          ▼                                         ▼
   [ Fast UI Return ]                     [ Outbox Delivery Worker ]
   "Queued for delivery" (<20ms)                    │
                                            Respects rate limits (1 msg/sec/chat)
                                            Handles HTTP 429 with retry_after
                                            Exponential backoff on 5xx/network errors
                                                    │
                                                    ▼
                                          [ Telegram Bot API ]
```

---

## 3. Database Schema: `telegram_outbox`

Add `telegramOutbox` table in `src/db/schema.ts`:

```typescript
export const telegramOutbox = sqliteTable("telegram_outbox", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull(),
  messageThreadId: integer("message_thread_id"),
  text: text("text").notNull(),
  pinMessage: integer("pin_message", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'failed'
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(5),
  nextAttemptAt: integer("next_attempt_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  lastError: text("last_error"),
  metadata: text("metadata", { mode: "json" }).$type<{
    semester?: number;
    type?: string;
    noticeId?: string;
    sentByUserId?: string | null;
  }>(),
  processedAt: integer("processed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_telegram_outbox_queue").on(table.status, table.nextAttemptAt),
  index("idx_telegram_outbox_chat").on(table.chatId),
  check("chk_telegram_outbox_status", sql`${table.status} IN ('pending', 'processing', 'completed', 'failed')`),
]);
```

---

## 4. Components & Flow

### 4.1 Enqueue API (`enqueueTelegramMessage`)
- Located in `src/features/telegram/services/telegram-outbox-service.ts`.
- Accepts either a single job or a batch of jobs (`enqueueTelegramBatch`).
- Inserts rows with `status: "pending"` and `nextAttemptAt: new Date()`.
- Fires a non-blocking execution of `drainTelegramOutbox()` in the background (`void drainTelegramOutbox().catch(...)`).

### 4.2 Outbox Drain Worker (`drainTelegramOutbox`)
- Selects top 10 items `where(and(eq(telegramOutbox.status, "pending"), lte(telegramOutbox.nextAttemptAt, new Date())))`.
- Concurrency guard: Atomically claims items by transitioning to `status: "processing"`.
- Inter-request pacing: Enforces 50ms pause between external calls to safeguard Telegram rate limits.
- On HTTP 429: Reads `retry_after` seconds, reschedules item to `now + retry_after * 1000`.
- On 5xx or Network Error: Reschedules with exponential backoff:
  $$\text{backoff} = \min(300\,000, 1000 \times 2^{\text{retryCount}})\text{ ms}$$
- When `retryCount >= maxRetries`: Transitions to `status: "failed"`.
- On Success: Transitions to `status: "completed"` and records a success log in `telegram_broadcast_logs`.

### 4.3 Action Refactoring
- `broadcastRoutineToTelegramAction`: Formats message, enqueues to outbox, returns immediately.
- `broadcastNoticeToTelegramAction`: Formats message, enqueues batch for selected semesters in a single SQL insert, returns immediately.
- `markSemesterRoutineModified`: Preserved.

---

## 5. Verification Plan
1. **Unit & Integration Script:** `scripts/maintenance/verify-telegram-outbox.ts`:
   - Enqueue test jobs (single & batch).
   - Mock Telegram responses (success, rate limit 429, network failure).
   - Verify backoff recalculation and `nextAttemptAt` progression.
   - Verify status transitions: `pending` -> `processing` -> `completed` / `failed`.
2. **Zero-Regression Typecheck:** `npx tsc --noEmit` exits with 0 errors.
3. **Database Migration Sync:** `drizzle/0020_p2_telegram_outbox.sql` generated and verified with `npx drizzle-kit check`.
