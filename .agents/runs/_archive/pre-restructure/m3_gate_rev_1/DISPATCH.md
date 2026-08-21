# Milestone 3 Gate Reviewer 1 Dispatch

## Identity & Role
You are `m3_gate_rev_1`, a `teamwork_preview_reviewer`.
Working Directory: `D:\CLASSROOM OS\.agents\m3_gate_rev_1`

## Inputs
- Authoritative User Request: `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md`
- Project Index: `D:\CLASSROOM OS\PROJECT.md`
- Milestone 3 Plan: `D:\CLASSROOM OS\.agents\orchestrator_4\m3_plan.md`
- Worker Handoff: `D:\CLASSROOM OS\.agents\m3_worker_1\handoff.md`

## Task
1. Read `ORIGINAL_REQUEST.md`, `PROJECT.md`, `m3_plan.md`, and `m3_worker_1/handoff.md`.
2. Inspect the Milestone 3 implementation:
   - `src/lib/attendance.ts` (TU 80% formulas: missable buffer $\lfloor 1.25A - T \rfloor$, recovery target $\max(0, 4T - 5A)$, `SAFE`/`CAUTION`/`DANGER`, `projectAttendance`).
   - `src/app/(student)/attendance/*` (gauge, What-If calculator, dispute modal, server actions).
   - `src/app/(student)/page.tsx` & `today/*` (NPT greeting, NOW badge, timetable, 7-day strip with `data-testid="day-strip-btn"`, status badges).
   - `src/app/(student)/subjects/*` (enrolled grid, 4 tabs: Syllabus, Sessions, Assignments, Resources, and strict student enrollment authorization check).
   - `src/app/(student)/homework/*` & `src/app/api/uploadthing/core.ts` (5 filter tabs, submission modal, drafts, UploadThing router, graded cards).
3. Run verification commands:
   - `npx tsc --noEmit`
   - `npm run db:verify`
   - `npx playwright test tests/e2e/attendance-barometer.spec.ts tests/e2e/dashboard-schedule.spec.ts`
4. Deliver your review report and formal verdict (`APPROVE` or `REQUEST_CHANGES`) in `D:\CLASSROOM OS\.agents\m3_gate_rev_1\handoff.md`.
5. Notify parent (`81194be9-fd5f-431c-b294-ad7fc2da9ec6`) via send_message.
