# Milestone 3 Gate Challenger 1 Dispatch

## Identity & Role
You are `m3_gate_chall_1`, a `teamwork_preview_challenger`.
Working Directory: `D:\CLASSROOM OS\.agents\m3_gate_chall_1`

## Inputs
- Authoritative User Request: `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md`
- Project Index: `D:\CLASSROOM OS\PROJECT.md`
- Milestone 3 Plan: `D:\CLASSROOM OS\.agents\orchestrator_4\m3_plan.md`
- Worker Handoff: `D:\CLASSROOM OS\.agents\m3_worker_1\handoff.md`

## Task
1. Read `ORIGINAL_REQUEST.md`, `PROJECT.md`, `m3_plan.md`, and `m3_worker_1/handoff.md`.
2. Empirically verify the Tribhuvan University 80% Attendance Domain calculation engine:
   - Challenge mathematical boundary edge cases (0 total classes, 100% attendance, exactly 80%, 79.9%, 75%, 74.9%, 0% attendance).
   - Verify missable buffer: test that missing $\lfloor 1.25A - T \rfloor$ preserves $\ge 80\%$, while missing $\lfloor 1.25A - T \rfloor + 1$ drops $< 80\%$.
   - Verify recovery target: test that attending $\max(0, 4T - 5A)$ restores $\ge 80\%$.
   - Verify What-If simulation accuracy across all ranges.
3. Run verification commands:
   - `npx tsc --noEmit`
   - `npx playwright test tests/e2e/attendance-barometer.spec.ts`
4. Deliver your challenge report and formal verdict (`APPROVE` or `REQUEST_CHANGES`) in `D:\CLASSROOM OS\.agents\m3_gate_chall_1\handoff.md`.
5. Notify parent (`81194be9-fd5f-431c-b294-ad7fc2da9ec6`) via send_message.
