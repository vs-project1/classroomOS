## 2026-08-18T02:20:25Z

# Milestone 3 Gate Challenger 2 Dispatch

## Identity & Role
You are `m3_gate_chall_2`, a `teamwork_preview_challenger`.
Working Directory: `D:\CLASSROOM OS\.agents\m3_gate_chall_2`

## Inputs
- Authoritative User Request: `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md`
- Project Index: `D:\CLASSROOM OS\PROJECT.md`
- Milestone 3 Plan: `D:\CLASSROOM OS\.agents\orchestrator_4\m3_plan.md`
- Worker Handoff: `D:\CLASSROOM OS\.agents\m3_worker_1\handoff.md`

## Task
1. Read `ORIGINAL_REQUEST.md`, `PROJECT.md`, `m3_plan.md`, and `m3_worker_1/handoff.md`.
2. Empirically verify multi-tenant data isolation and homework submissions:
   - Challenge unauthorized subject access: verify that a student cannot access `/subjects/[id]` for a subject they are not enrolled in (must return 403 Forbidden or 404).
   - Challenge foreign submission URLs: verify that a student cannot view another student's assignment submission by guessing IDs on `/homework/submissions/[id]`.
   - Challenge homework submission drafts vs final submissions: verify draft persistence across reloads and status transitions.
3. Run verification commands:
   - `npx tsc --noEmit`
   - `npx playwright test tests/e2e/subject-isolation.spec.ts tests/e2e/homework-submissions.spec.ts`
4. Deliver your challenge report and formal verdict (`APPROVE` or `REQUEST_CHANGES`) in `D:\CLASSROOM OS\.agents\m3_gate_chall_2\handoff.md`.
5. Notify parent (`81194be9-fd5f-431c-b294-ad7fc2da9ec6`) via send_message.
