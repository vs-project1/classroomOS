# Implementation Plan: P2 Telegram Transactional Outbox & Resilient Delivery Engine

**Spec:** `docs/superpowers/specs/2026-10-16-p2-telegram-transactional-outbox-design.md`  
**Goal:** Replace synchronous Telegram API calls in server actions with an atomic transactional outbox queue, background drain worker, exponential backoff, and rate-limiting.

---

## Proposed Tasks

### Task 1: Database Schema Extension & Migration
- File: `src/db/schema.ts`
  - Add `telegramOutbox` table definition with `chatId`, `messageThreadId`, `text`, `pinMessage`, `status`, `retryCount`, `maxRetries`, `nextAttemptAt`, `lastError`, `metadata`, `processedAt`, `createdAt`, `updatedAt`.
  - Add check constraint on `status` (`'pending'`, `'processing'`, `'completed'`, `'failed'`).
  - Add indexes on `(status, nextAttemptAt)` and `chatId`.
  - Export types `TelegramOutboxItem` and `NewTelegramOutboxItem`.
- Drizzle Migration:
  - Generate `drizzle/0020_p2_telegram_outbox.sql`.
  - Update `drizzle/meta/` snapshot and journal.
  - Run `npx drizzle-kit check` to verify schema integrity.
  - Apply table creation migration to `local.db`.

### Task 2: Core Outbox Service & Drain Worker
- File: `src/features/telegram/services/telegram-outbox-service.ts`
  - `enqueueTelegramMessage(job)`: Enqueues a single outbox message.
  - `enqueueTelegramBatch(jobs)`: Atomically enqueues a batch of messages.
  - `drainTelegramOutbox(options)`: Background worker with:
    - Atomically claims pending jobs (`status = 'processing'`).
    - Paces delivery with inter-request sleep (50ms).
    - Checks Telegram bot token and settings.
    - Sends message via `sendTelegramMessage`.
    - Handles HTTP 429 (`retry_after`) and network failures with exponential backoff.
    - Updates outbox status to `completed` or `failed`.
    - Writes delivery log to `telegramBroadcastLogs`.
  - Export `getTelegramOutboxStats()` for monitoring queue depth and status counts.

### Task 3: Refactor Server Actions to Use Outbox
- File: `src/features/telegram/actions/telegram-actions.ts`
  - Update `broadcastRoutineToTelegramAction`: format message and call `enqueueTelegramMessage`, returning immediate success.
  - Update `broadcastNoticeToTelegramAction`: format message and call `enqueueTelegramBatch` across all target semesters, returning immediate success.
  - Add outbox queue status action `getTelegramOutboxStatsAction` for admin dashboard visibility.

### Task 4: In-Process Background Scheduler Integration
- File: `src/features/telegram/services/telegram-brief-service.ts`
  - Hook outbox worker into the existing in-process interval poller so pending outbox jobs are checked every 30-60 seconds as a safety net alongside proactive event-driven drains.

### Task 5: Automated Verification Suite & Pre-Commit Audit
- File: `scripts/maintenance/verify-telegram-outbox.ts`
  - Test 1: Single enqueue and atomic database insertion.
  - Test 2: Batch enqueue across multiple semesters.
  - Test 3: Status transition (`pending` -> `processing` -> `completed`).
  - Test 4: Exponential backoff calculation and retry scheduling on simulated failures.
  - Test 5: Rate-limiting / 429 `retry_after` backoff handling.
  - Test 6: Final failure state when `retryCount >= maxRetries`.
- Run `npx tsc --noEmit` and confirm 0 errors.
- Run `npm run pre-commit:audit` and `npm run review:staged`.
- Update `LEARNINGS.md` with architectural takeaways.
