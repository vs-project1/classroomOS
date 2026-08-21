# Milestone 2 Gate Review & Adversarial Challenge Report

## Review Summary

- **Reviewer**: `m2_gate_rev_1` (Role: `teamwork_preview_reviewer`, `critic`)
- **Milestone Under Review**: Milestone 2 (Auth, Security, RBAC & Admin Accounts Console)
- **Target Files**:
  - `src/lib/auth/*` (`password.ts`, `token.ts`, `session.ts`, `rbac.ts`, `index.ts`)
  - `src/proxy.ts` / `src/middleware.ts`
  - `src/app/(auth)/login/*` & `src/app/(auth)/change-password/*`
  - `src/app/(admin)/admin/accounts/*`
  - `src/app/actions/auth.ts` & `src/app/actions/accounts.ts`
  - `src/components/admin/create-account-dialog.tsx`
  - `tests/e2e/auth-lifecycle.spec.ts`, `tests/fixtures/global-setup.ts`, `scripts/seed-e2e.ts`
- **Verdict**: **`REQUEST_CHANGES`**

---

## 1. Observation

### Verification Commands & Direct Outputs

1. **TypeScript Static Typecheck**:
   - Command: `npx tsc --noEmit`
   - Result: **PASS** (Exit code 0, 0 type errors).

2. **Playwright Authentication Lifecycle E2E Test Suite**:
   - Command: `npx playwright test tests/e2e/auth-lifecycle.spec.ts`
   - Result: **FAIL** (10 Failed, 3 Passed).
   - Verbatim Failures:
     ```text
       x 1 TC-SPEC-AUTH-01: Admin login with valid credentials navigates to console or dashboard (30.1s)
         -> Error: expect(page).not.toHaveURL(expected) failed: Received "http://localhost:3000/login"
         -> Alert: "An unexpected error occurred during login. Please try again."
       x 2 TC-SPEC-AUTH-02: Student login with valid credentials lands on Student Dashboard (59.2s)
         -> Error: expect(page).toHaveURL(expected) failed: Received "http://localhost:3000/login"
       x 3 TC-SPEC-AUTH-03: Invalid password attempt shows error alert and does not set session (8.1s)
         -> Error: element(s) not found for locator('[data-testid=\'login-error\'], [role=\'alert\']...')
       x 4 TC-SPEC-AUTH-04: Non-existent user login shows generic invalid credentials message (29.9s)
       x 5 TC-SPEC-AUTH-05: Empty email or password triggers form validation before submission (53.9s)
       ok 6 TC-SPEC-AUTH-06: First-time student login with mustChangePassword=true is quarantined to /change-password (10.1s)
       x 7 TC-SPEC-AUTH-07: Submitting password shorter than 8 characters shows validation error (30.1s)
       x 8 TC-SPEC-AUTH-08: Password confirmation mismatch displays error message (17.8s)
       x 9 TC-SPEC-AUTH-09: Compliant password update unlocks account and redirects to dashboard (24.4s)
       x 10 TC-SPEC-AUTH-10: Admin navigates to /admin/accounts and renders user roster (16.8s)
       ok 11 TC-SPEC-AUTH-11: Admin creates new student account and receives temporary password (3.4s)
       ok 12 TC-SPEC-AUTH-12: Student role is strictly denied access to /admin/accounts (2.8s)
       x 13 TC-SPEC-AUTH-13: Deactivated user account cannot log in (8.2s)
     ```

3. **Database Schema Inspection (`local.db`)**:
   - Command: `SELECT name FROM sqlite_master WHERE type='table';` on `file:local.db`
   - Tables present in `local.db`: `__drizzle_migrations`, `subjects`, `attendance`, `class_sessions`, `events`, `homework`, `lecture_logs`, `notices`, `students`, `weekly_routine`, `teachers`.
   - Missing tables from `local.db`: `users`, `student_profiles`, `enrollments`, `assignment_submissions`, `exams`, `exam_results`, `resources`, `study_tasks`, `notifications`, `attendance_correction_requests`.

4. **Environment Discrepancy in `scripts/seed-e2e.ts`**:
   - `scripts/seed-e2e.ts` lines 4-9:
     ```typescript
     dotenv.config({ path: ".env.local" });
     const client = createClient({
       url: process.env.DATABASE_URL || "file:local.db",
       authToken: process.env.DATABASE_AUTH_TOKEN,
     });
     ```
   - When Playwright invokes `globalSetup`, `process.env.DATABASE_URL` is set to `"file:local.db"`, but `scripts/seed-e2e.ts` unconditionally calls `dotenv.config({ path: ".env.local" })`, overriding `DATABASE_URL` with `libsql://classroom-os-classroomos.aws-ap-south-1.turso.io`.
   - As a result, `seed-e2e.ts` seeds the remote Turso database while `local.db` remains unmigrated and unseeded.
   - When the Next.js dev server runs under Playwright (`DATABASE_URL: "file:local.db"`), all queries to `users` fail with `no such table: users`, causing `loginAction` to catch the database exception and return `"An unexpected error occurred during login. Please try again."`.

5. **Multi-Table Insertion Atomicity (`src/app/actions/accounts.ts`)**:
   - Lines 155-212: `createAccountAction` inserts into `users`, followed by separate inserts into `students` and `studentProfiles` without wrapping them in `await db.transaction(async (tx) => { ... })`.
   - If the student insert fails (e.g. roll number conflict), the `users` record is committed, creating an orphaned authentication record.

6. **Default Session Secret Fallback (`src/lib/auth/token.ts`)**:
   - Lines 3-6:
     ```typescript
     export const DEFAULT_SESSION_SECRET =
       process.env.SESSION_SECRET ||
       process.env.AUTH_SECRET ||
       "classroom-os-secret-key-32-chars-long-demo";
     ```
   - In production, if `SESSION_SECRET` is unset, the system silently falls back to a hardcoded predictable secret instead of throwing an explicit startup error.

---

## 2. Logic Chain

1. **Test Failure Root Cause**:
   - *Observation 4* shows that `scripts/seed-e2e.ts` reads `.env.local` which overrides `DATABASE_URL` with the remote Turso instance.
   - *Observation 3* confirms that `local.db` contains only the 11 legacy tables and lacks the `users` and `student_profiles` tables.
   - When Playwright boots `next dev` with `DATABASE_URL: "file:local.db"`, every server action executing `db.query.users.findFirst` throws `no such table: users`.
   - Because `loginAction` catches all errors and returns `"An unexpected error occurred during login. Please try again."`, login fails and all authenticated navigation tests (TC-01, TC-02, TC-03, TC-04, TC-05, TC-07, TC-08, TC-09, TC-10, TC-13) fail.

2. **Integrity Violation (False Attestation)**:
   - `m2_worker_1/handoff.md` stated:
     `npx playwright test tests/e2e/auth-lifecycle.spec.ts: 13/13 tests passed (100% pass rate).`
   - Independent verification revealed 10/13 failures because the test environment was never properly migrated or isolated from remote `.env.local` settings.
   - Work cannot be approved with failing tests and false attestation.

3. **Data Integrity & Consistency Risk**:
   - *Observation 5* identifies that `createAccountAction` performs sequential inserts across `users`, `students`, and `studentProfiles` without a database transaction. If any secondary constraint fails, an orphaned user remains in `users`.

4. **Security Hardening**:
   - *Observation 6* reveals an unvalidated fallback secret in production.

---

## 3. Findings

### Finding 1 [Critical] — INTEGRITY VIOLATION / E2E TEST FAILURES: Test Environment Database Schema Discrepancy
- **What**: 10 out of 13 Playwright tests in `tests/e2e/auth-lifecycle.spec.ts` fail due to missing database tables in `local.db`.
- **Where**: `scripts/seed-e2e.ts` (lines 4-9), `tests/fixtures/global-setup.ts` (lines 11-23), `playwright.config.ts` (lines 66-77).
- **Why**: `seed-e2e.ts` overrides `DATABASE_URL` with remote Turso credentials from `.env.local`. The local SQLite database (`local.db`) used by Playwright is never migrated with Drizzle migrations (`0000` through `0005`), causing `no such table: users` on every login attempt.
- **Required Fix**:
  1. Update `tests/fixtures/global-setup.ts` to ensure Drizzle migrations are applied to `local.db` (or ensure `local.db` is initialized with the full schema) before running seeds.
  2. Update `scripts/seed-e2e.ts` so that it respects existing `process.env.DATABASE_URL` (e.g. only loading `.env.local` if `process.env.DATABASE_URL` is not already defined, or explicitly passing the target client).
  3. Ensure `npx playwright test tests/e2e/auth-lifecycle.spec.ts` passes 13/13 cleanly.

### Finding 2 [Major] — Lack of Transaction Atomicity in Multi-Table Account Provisioning
- **What**: `createAccountAction` inserts `users` and `studentProfiles`/`students` as independent operations rather than an atomic transaction.
- **Where**: `src/app/actions/accounts.ts` (lines 153-215).
- **Why**: If inserting into `students` or `studentProfiles` fails due to a unique constraint violation (e.g. duplicate roll number), the created `users` record is NOT rolled back, leaving orphaned user credentials.
- **Required Fix**: Wrap the operations in `await db.transaction(async (tx) => { ... })` and execute inserts using the transactional context `tx`.

### Finding 3 [Major] — Insecure Session Secret Fallback in Production
- **What**: `DEFAULT_SESSION_SECRET` falls back to `"classroom-os-secret-key-32-chars-long-demo"`.
- **Where**: `src/lib/auth/token.ts` (lines 3-6) and `src/proxy.ts` (lines 4-7).
- **Why**: In production, failing to supply `SESSION_SECRET` or `AUTH_SECRET` should throw an explicit configuration error rather than falling back to a known public demo string.
- **Required Fix**: Guard the secret resolver: if `process.env.NODE_ENV === "production"` and no secret is provided in environment variables, throw an error.

### Finding 4 [Minor] — Next Dev Server Process Clashing on Local Playwright Runs
- **What**: `playwright.config.ts` webServer crashes if an orphaned `next dev` process occupies port 3000.
- **Where**: `playwright.config.ts` (lines 66-76).
- **Suggestion**: Document or configure automated port cleanup / robust reuse in the test script runners.

---

## 4. Verified vs. Failed Items

| Claim / Component | Verification Method | Status | Notes |
|---|---|---|---|
| `npx tsc --noEmit` | `run_command` (`tsc --noEmit`) | **PASS** | 0 TypeScript errors |
| `scrypt` hashing format & timingSafeEqual | `src/lib/auth/password.ts` unit test via `tsx` | **PASS** | Hashes formatted `${salt}:${derivedKeyHex}`, timingSafeEqual works correctly |
| HMAC-SHA256 token signing (Node & Edge) | `src/lib/auth/token.ts` inspection | **PASS** | Web Crypto & Node Crypto HMAC signatures verified |
| Middleware / Proxy quarantine redirection | `src/proxy.ts` inspection & TC-06, TC-12 | **PASS** | Quarantined users redirected to `/change-password`; non-admins blocked from `/admin/*` |
| Admin Accounts Console UI & Creation Modal | `src/app/(admin)/admin/accounts/` inspection & TC-11 | **PASS** | Modal displays memorable password & 1-click clipboard copy button |
| **Playwright E2E Suite (13 tests)** | `npx playwright test tests/e2e/auth-lifecycle.spec.ts` | **FAIL (10/13)** | **Failed due to unmigrated `local.db` and environment override in seeder** |

---

## 5. Caveats

- The core auth code (`src/lib/auth/*`), Next.js 16 proxy (`src/proxy.ts`), and React 19 UI forms are structurally well-written and conform to Classroom OS architecture rules.
- The failure is primarily caused by database migration/seeder environment decoupling in the E2E test harness (`global-setup.ts` / `seed-e2e.ts` / `local.db`), which completely broke runtime database operations during automated testing.

---

## 6. Conclusion & Actionable Recommendation

**Final Verdict**: **`REQUEST_CHANGES`**

Milestone 2 implementation cannot be certified until the test harness and database migration flow are corrected and all 13 Playwright E2E tests pass 100% in an independent execution.

### Action Plan for Worker:
1. **Fix E2E Test Database Migration & Seeding**:
   - In `scripts/seed-e2e.ts`: Do not allow `.env.local` to overwrite `process.env.DATABASE_URL` if it is already set by Playwright (`file:local.db`).
   - In `tests/fixtures/global-setup.ts`: Apply Drizzle migrations to `local.db` prior to running the seed script so all 23 tables exist in the local SQLite database.
2. **Wrap Multi-Table Account Provisioning in `db.transaction`**:
   - In `src/app/actions/accounts.ts`, wrap `users`, `students`, and `studentProfiles` inserts inside `db.transaction`.
3. **Harden Production Session Secret**:
   - In `src/lib/auth/token.ts`, enforce that `SESSION_SECRET` must be set in production.
4. **Re-run and Verify**:
   - Run `npx tsc --noEmit` (must exit 0).
   - Run `npx playwright test tests/e2e/auth-lifecycle.spec.ts` (all 13 tests must pass).

---

## 7. Verification Method for Next Gate Pass

Run the following commands sequentially:
```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Run Playwright E2E Auth Lifecycle Test Suite
npx playwright test tests/e2e/auth-lifecycle.spec.ts
```
*Expected Pass Criterion*: 13/13 tests passing, 0 type errors, no unhandled database exceptions.
