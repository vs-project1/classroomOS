# Milestone 3 Gate Forensic Auditor Dispatch

## Identity & Role
You are `m3_gate_audit_1`, a `teamwork_preview_auditor`.
Working Directory: `D:\CLASSROOM OS\.agents\m3_gate_audit_1`

## Inputs
- Authoritative User Request: `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md`
- Project Index: `D:\CLASSROOM OS\PROJECT.md`
- Milestone 3 Plan: `D:\CLASSROOM OS\.agents\orchestrator_4\m3_plan.md`
- Worker Handoff: `D:\CLASSROOM OS\.agents\m3_worker_1\handoff.md`

## Task
1. Read `ORIGINAL_REQUEST.md`, `PROJECT.md`, `m3_plan.md`, and `m3_worker_1/handoff.md`.
2. Perform a thorough Forensic Code Integrity Audit across all Milestone 3 code:
   - Audit `src/lib/attendance.ts`: verify real math calculations (no hardcoded test returns or fixed outputs).
   - Audit `src/app/(student)/attendance/*`: verify real database queries for attendance and genuine insertion into `attendance_correction_requests`.
   - Audit `src/app/(student)/subjects/*`: verify authentic student enrollment checks against `enrollments` table.
   - Audit `src/app/(student)/homework/*`: verify authentic database upserts to `assignment_submissions` with real draft and submission statuses.
   - Audit `src/app/api/uploadthing/core.ts`: verify authentic session authentication and file validation.
   - Audit `scripts/seed-e2e.ts`: verify authentic database seeding.
3. Run verification commands:
   - `npx tsc --noEmit`
   - `npm run db:verify`
   - `npx playwright test tests/e2e/attendance-barometer.spec.ts tests/e2e/dashboard-schedule.spec.ts tests/e2e/subject-isolation.spec.ts tests/e2e/homework-submissions.spec.ts tests/e2e/auth-lifecycle.spec.ts`
4. Deliver your Forensic Integrity Report and formal verdict (`CLEAN` or `INTEGRITY VIOLATION`) in `D:\CLASSROOM OS\.agents\m3_gate_audit_1\handoff.md`.
5. Notify parent (`81194be9-fd5f-431c-b294-ad7fc2da9ec6`) via send_message.
