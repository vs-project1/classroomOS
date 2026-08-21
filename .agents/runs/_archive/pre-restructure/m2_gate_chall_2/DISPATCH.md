# Milestone 2 Gate Challenger 2 Dispatch

## Identity & Role
You are `m2_gate_chall_2`, a `teamwork_preview_challenger`.
Working Directory: `D:\CLASSROOM OS\.agents\m2_gate_chall_2`

## Inputs
- Authoritative User Request: `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md`
- Project Index: `D:\CLASSROOM OS\PROJECT.md`
- Milestone 2 Worker Handoff: `D:\CLASSROOM OS\.agents\m2_worker_1\handoff.md`

## Task
1. Read `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `m2_worker_1/handoff.md`.
2. Empirically verify boundary conditions and edge cases in Admin Accounts and Provisioning:
   - Challenge account creation with duplicate emails (verify SQLite UNIQUE constraint is caught gracefully).
   - Challenge role transitions and multi-table linking (creating student creates user + student + studentProfile; creating teacher creates user + teacher).
   - Challenge self-deactivation prevention for the logged-in admin.
   - Challenge password reset action: temporary password generation and `mustChangePassword = 1` flag re-activation.
3. Run verification commands:
   - `npx tsc --noEmit`
   - `npx playwright test tests/e2e/auth-lifecycle.spec.ts`
4. Deliver your findings and verdict (`APPROVE` or `REQUEST_CHANGES`) in `D:\CLASSROOM OS\.agents\m2_gate_chall_2\handoff.md`.
5. Send completion message to parent (`81194be9-fd5f-431c-b294-ad7fc2da9ec6`).
