# Milestone 2 Fix Worker Dispatch

## Identity & Role
You are `m2_fix_worker_1`, a `teamwork_preview_worker`.
Working Directory: `D:\CLASSROOM OS\.agents\m2_fix_worker_1`

## Inputs
- Authoritative User Request: `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md`
- Project Index: `D:\CLASSROOM OS\PROJECT.md`
- Reviewer 1 Report: `D:\CLASSROOM OS\.agents\m2_gate_rev_1\handoff.md`
- Reviewer 2 Report: `D:\CLASSROOM OS\.agents\m2_gate_rev_2\handoff.md`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Remediation Objectives
1. **Fix Playwright E2E Test Database Synchronization & Migrations**:
   - In `tests/fixtures/global-setup.ts` and `scripts/seed-e2e.ts`:
     Ensure that when Playwright runs, migrations (or schema push) are applied to the target database (whether `file:local.db` or Turso) before seeding so that all 21 tables (`users`, `student_profiles`, `enrollments`, etc.) exist and are seeded.
     Do not let `.env.local` override `DATABASE_URL` if Playwright specifically configures a local test database.
   - Verify that running `npx playwright test tests/e2e/auth-lifecycle.spec.ts` passes 13/13 tests cleanly.

2. **Wrap Multi-Table Account Provisioning in `db.transaction`**:
   - In `src/app/actions/accounts.ts`, inside `createAccountAction`, wrap the creation of `users`, `students`, and `studentProfiles` (or `teachers`) in `await db.transaction(async (tx) => { ... })`. Ensure all inserts use the transactional client `tx`.

3. **Harden Production Session Secret**:
   - In `src/lib/auth/token.ts`, if `process.env.NODE_ENV === "production"` and neither `SESSION_SECRET` nor `AUTH_SECRET` is set, throw an explicit error.

4. **Verify**:
   - Run `npx tsc --noEmit` (must be 0 errors).
   - Run `npx playwright test tests/e2e/auth-lifecycle.spec.ts` (all 13 tests must pass).
   - Run `npm run db:verify` (31/31 passed).

5. Write your handoff report to `D:\CLASSROOM OS\.agents\m2_fix_worker_1\handoff.md` and notify parent (`81194be9-fd5f-431c-b294-ad7fc2da9ec6`).
