# S10 Report — Minimal viable session revocation (audit C6 + DB PRAGMA finding)

**Date:** 2026-08-21
**Branch:** fix/security-remediation (HEAD `b2aed45`, no new commits)
**Agent:** S10 (security-guard role; owned files only)

## STATUS: DONE

## Problem (audit C6)
Sessions were non-revocable 30-day HMAC bearer blobs: no server-side registry, so password change/reset and deactivation never evicted a live session. Stolen/old cookies stayed valid up to 30 days regardless of credential state.

## Files changed (all within ownership)
1. **`src/db/schema.ts`** — new `sessions` table: `id` (text PK = SHA-256 of signed token), `user_id` (FK → `users.id`, ON DELETE cascade), `expires_at`, `created_at`; index `idx_sessions_user_id`; `sessionsRelations`; exported types `Session`/`NewSession`. Matches spec exactly.
2. **`src/db/client.ts`** — `PRAGMA foreign_keys = ON;` issued as the first statement on the libsql client at module init, with `.catch()` logging (remote/Turso drivers may reject PRAGMAs; local file enforces). Closes audit DB finding.
3. **`src/lib/auth/token.ts`** — added `getSessionTokenId(token)` = SHA-256 hex digest of the full signed token. Only the digest is ever persisted; raw bearer tokens are not stored.
4. **`src/lib/auth/session.ts`**
   - `createSession`: inserts `{ id: tokenDigest, userId, expiresAt }` row before setting the cookie → covers ALL login paths (`loginAction`, `changePasswordAction`) without touching `features/auth/**`.
   - `getCurrentUser`: after HMAC verification, requires a matching row that is unexpired; missing/expired row ⇒ hard `null` (deliberately NO fixture-persona fallback, so eviction holds even in dev).
   - New `revokeUserSessions(userId)`: deletes all rows for the user.
   - `invalidateSession` (logout): now also deletes the caller's own row before clearing cookies — logout is server-side effective, not just cookie clearing.
5. **`src/features/users/actions/accounts.ts`** (eviction calls only)
   - `resetPasswordAction`: `await revokeUserSessions(userId)` immediately after the password-hash update.
   - `toggleAccountStatusAction`: evicts when `newStatus === false` (deactivation path).

## Migration
- Generated via `pnpm db:generate` → **`drizzle/0006_unusual_morph.sql`** (+ `drizzle/meta/0006_snapshot.json`, `_journal.json` updated).
  SQL: `CREATE TABLE sessions (...)` with cascade FK + `CREATE INDEX idx_sessions_user_id`. (File also carries one pre-existing snapshot-drift artifact: re-creation of `unq_class_session_subject_date`.)
- Applied **local file DB ONLY**: `pnpm db:migrate` run with `$env:DATABASE_URL="file:local.db"` override (dotenv does not override pre-set process env; `.env.local`'s remote Turso URL was never contacted; auth token blanked for the run).
- Verified against `file:local.db`: `PRAGMA table_info(sessions)` → `["id","user_id","expires_at","created_at"]`; `PRAGMA foreign_key_list(sessions)` → `users`; `__drizzle_migrations` count = 7 (0000–0006 applied).
- **Remote DB NOT migrated** — deployment must run `pnpm db:migrate` against Turso in a controlled window.

## Gates / evidence
- `npx tsc --noEmit` → **exit 0**.
- `git status --porcelain` confirms changes confined to owned files + drizzle artifacts; no commit made.

## Deferred items (flagged for follow-up)
1. **⚠ PROMINENT: change-password eviction NOT wired.** The call site lives in `features/auth/actions/auth.ts::changePasswordAction` — FORBIDDEN this run (another agent owns it). Until a follow-up adds `revokeUserSessions(currentUser.id)` there, a user who completes change-password keeps their ORIGINAL login token valid (its row survives until natural expiry or next reset/deactivation). Note their cookie does get refreshed by the `createSession` call inside that action, but the old row must be explicitly deleted.
2. **Edge middleware gap:** `verifySessionTokenEdge` (proxy/middleware) still validates HMAC+expiry only — no DB access at the edge. Revoked tokens may pass middleware route gates but every server action/page data path goes through `getCurrentUser`/`requireAuth`, which now deny. Residual: revoked users can reach edge-permitted shells but retrieve no authenticated data.
3. **One-time global logout on deploy:** pre-existing cookies have no rows ⇒ all users are logged out once when this ships to an environment. Expected consequence of adding revocation.
4. **E2E fixture impact:** `tests/fixtures/auth.fixture.ts` mints `auth_session` cookies directly via `createSessionToken` with no DB row ⇒ fixture-based tests will now fail `getCurrentUser`. Fixture needs to insert a matching `sessions` row (or log in through the UI). Test files were outside this task's EXACTLY-scoped ownership.
5. Migration `0006` includes the stray `unq_class_session_subject_date` re-creation from snapshot drift — harmless here, worth a `drizzle-kit check` hygiene pass later.

## Handoff summary
- **Files changed:** schema.ts, client.ts, token.ts, session.ts, accounts.ts (eviction calls), drizzle/0006_unusual_morph.sql + meta.
- **Threat closed:** C6 — sessions are now server-side revocable; admin password reset and account deactivation instantly kill live sessions; logout deletes server state; FK enforcement enabled at DB level.
- **Residual risk:** change-password path not yet evicting (forbidden file); edge middleware still HMAC-only.
- **Suggested follow-ups:** add eviction to `changePasswordAction` once `features/auth` unlocks; update e2e auth fixture; migrate remote DB during deploy window; consider lazy cleanup of expired rows (indexed by user; expiry scan optional).
