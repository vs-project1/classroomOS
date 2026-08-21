# Milestone 2 Gate Review Report (Reviewer & Adversarial Critic)

## Review Summary

**Verdict**: **`REQUEST_CHANGES`**

---

## 1. Observation

### A. TypeScript Typecheck Verification
- Command: `npx tsc --noEmit`
- Result: **0 errors** (Exit code: 0).
- Verbatim output:
  ```text
  npm notice run classroom-os@0.1.0 npx
  npm notice run tsc --noEmit
  ```

### B. Database Schema & Constraint Verification
- Command: `npm run db:verify`
- Result: **31/31 passed** (Exit code: 0).
- All SQLite CHECK constraints, unique indexes, and foreign key cascades pass cleanly against the Turso cloud database (`libsql://classroom-os-classroomos.aws-ap-south-1.turso.io`).

### C. Playwright E2E Test Execution (`tests/e2e/auth-lifecycle.spec.ts`)
- Command: `npx playwright test tests/e2e/auth-lifecycle.spec.ts`
- Result: **9 FAILED, 4 PASSED** (Exit code: 1).
- Verbatim failures:
  ```text
  9 failed
    [Desktop Chrome] › tests\e2e\auth-lifecycle.spec.ts:9:9 › TC-SPEC-AUTH-01: Admin login with valid credentials navigates to console or dashboard 
    [Desktop Chrome] › tests\e2e\auth-lifecycle.spec.ts:19:9 › TC-SPEC-AUTH-02: Student login with valid credentials lands on Student Dashboard 
    [Desktop Chrome] › tests\e2e\auth-lifecycle.spec.ts:29:9 › TC-SPEC-AUTH-03: Invalid password attempt shows error alert and does not set session 
    [Desktop Chrome] › tests\e2e\auth-lifecycle.spec.ts:40:9 › TC-SPEC-AUTH-04: Non-existent user login shows generic invalid credentials message 
    [Desktop Chrome] › tests\e2e\auth-lifecycle.spec.ts:70:9 › TC-SPEC-AUTH-07: Submitting password shorter than 8 characters shows validation error 
    [Desktop Chrome] › tests\e2e\auth-lifecycle.spec.ts:85:9 › TC-SPEC-AUTH-08: Password confirmation mismatch displays error message 
    [Desktop Chrome] › tests\e2e\auth-lifecycle.spec.ts:98:9 › TC-SPEC-AUTH-09: Compliant password update unlocks account and redirects to dashboard 
    [Desktop Chrome] › tests\e2e\auth-lifecycle.spec.ts:114:9 › TC-SPEC-AUTH-10: Admin navigates to /admin/accounts and renders user roster 
    [Desktop Chrome] › tests\e2e\auth-lifecycle.spec.ts:154:9 › TC-SPEC-AUTH-13: Deactivated user account cannot log in 
  4 passed (5.3m)
  ```
- Detailed Runtime Error in `test-results/auth-lifecycle-F4-F5-F6-F7-92095-ters-shows-validation-error-Desktop-Chrome/error-context.md`:
  ```text
  Caused by: LibsqlError
  SQLITE_ERROR: no such table: users
  Failed query: select "id", "email", "password_hash", "role", "must_change_password", "is_active", "created_at", "updated_at" from "users" "users" where "users"."email" = ? limit ? params: newstudent@classroom.edu.np,1
  ```
- Inspection of `local.db` tables:
  ```text
  local.db tables: [
    '__drizzle_migrations',
    'subjects',
    'attendance',
    'class_sessions',
    'events',
    'homework',
    'lecture_logs',
    'notices',
    'students',
    'weekly_routine',
    'teachers'
  ]
  ```
  `local.db` lacks all 10 Milestone 1 new tables (`users`, `student_profiles`, `enrollments`, `assignment_submissions`, `exams`, `exam_results`, `resources`, `study_tasks`, `notifications`, `attendance_correction_requests`).

### D. Source Code Inspection
1. **Next.js 16 Proxy / Middleware (`src/proxy.ts`)**:
   - Correctly exports `export async function proxy(...)`, `export const middleware = proxy;`, and `export default proxy;`.
   - Uses Web Crypto API `verifySessionTokenEdge` to maintain 0ms Edge compatibility without hitting SQLite.
   - Enforces password quarantine redirect to `/change-password` when `mustChangePassword === true`.
   - Protects `/admin/*` routes from unauthorized roles.
2. **Auth Service (`src/lib/auth/`)**:
   - `password.ts`: Uses `crypto.scrypt` (16-byte salt, 64-byte key length) and `crypto.timingSafeEqual` with memorable temporary password generator.
   - `session.ts`: Awaits `const cookieStore = await cookies()` conforming to Next.js 16 / React 19 async cookie conventions.
   - `rbac.ts`: Defines permission matrix across `ADMIN`, `TEACHER`, `CR`, `STUDENT`.
3. **Server Actions (`src/app/actions/auth.ts` & `src/app/actions/accounts.ts`)**:
   - React 19 Server Actions (`"use server"`) using `useActionState` across UI forms.
   - Zod validation schemas (`loginSchema`, `changePasswordSchema`, `CreateAccountSchema`) with refined password matching and temporary password divergence checks.
   - Gracefully catches SQLite `UNIQUE constraint failed` without pre-emptive `SELECT` queries.
4. **Admin Accounts Console (`src/app/(admin)/admin/accounts/`)**:
   - Protected by `requireAuth(["ADMIN"])`.
   - Self-deactivation protection in `toggleAccountStatusAction` (`if (userId === currentAdmin.id)`).
   - Temporary password modal with 1-click clipboard copy.

---

## 2. Logic Chain

1. *Source Implementation Quality*: The domain code in `src/lib/auth/*`, `src/proxy.ts`, `src/app/actions/*`, and `src/app/(admin)/admin/accounts/*` adheres cleanly to Next.js 16 conventions, React 19 Server Actions, and SQLite constraint error handling.
2. *Database Environment Divergence*:
   - In `.env.local`, `DATABASE_URL` is set to the remote Turso database `libsql://classroom-os-classroomos.aws-ap-south-1.turso.io`.
   - `npm run db:verify` and `npm run db:seed` run with `--env-file=.env.local`, connecting to and passing all 31 suites on Turso.
   - In `playwright.config.ts`, `webServer` executes `npm run dev` with `DATABASE_URL: process.env.DATABASE_URL || "file:local.db"`. Because `playwright.config.ts` does not load `.env.local`, `process.env.DATABASE_URL` resolves to `"file:local.db"`.
   - The local SQLite database `local.db` was never updated with the Milestone 1 migrations and lacks the `users` and `student_profiles` tables.
3. *Runtime Failure in E2E*:
   - When Playwright tests run, the Next.js server spawned by Playwright queries `local.db`, triggering `SQLITE_ERROR: no such table: users` on every authenticated route and action.
   - Consequently, 9 out of 13 tests failed.

---

## 3. Caveats

- The domain implementation code is technically sound and adheres to architecture standards.
- The failure is caused by an environment / configuration divergence between `playwright.config.ts`, `.env.local`, and the unmigrated `local.db` file.

---

## 4. Conclusion

Milestone 2 implementation code is well-structured and compliant with Next.js 16 conventions, Edge runtime constraints, and RBAC rules. However, because **9 of the 13 Playwright E2E tests fail** due to database environment divergence and missing tables in `local.db`, the gate verification cannot approve Milestone 2 in its current state.

**Verdict**: **`REQUEST_CHANGES`**

### Required Changes:
1. **Synchronize E2E Database Environment**:
   - In `playwright.config.ts`, ensure `.env.local` is loaded (via `dotenv.config({ path: ".env.local" })` or passing `DATABASE_AUTH_TOKEN`), OR ensure `local.db` is migrated with all 21 tables before running tests.
2. **Verify 13/13 E2E Tests Pass**:
   - Execute `npx playwright test tests/e2e/auth-lifecycle.spec.ts` and ensure all 13 tests pass cleanly.

---

## 5. Verification Method

To verify the required fixes:

1. **Type Checking**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0, 0 errors.

2. **Playwright E2E Auth Lifecycle Tests**:
   ```bash
   npx playwright test tests/e2e/auth-lifecycle.spec.ts
   ```
   *Expected*: All 13 tests pass (100% pass rate).

3. **Database Constraint Verification**:
   ```bash
   npm run db:verify
   ```
   *Expected*: 31/31 suites pass.
