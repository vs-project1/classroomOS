# Master Execution Plan: Orchestrator 4

## Objective
Finalize and deliver Classroom OS V1 Student Academic Operating System across Milestones 2, 3, and 4.

## Phase 1: Milestone 2 Gate Verification & Certification
1. Dispatch Gate Verification Subagents for M2:
   - `m2_rev_1` (`teamwork_preview_reviewer`): Code review, security analysis, RBAC & quarantine verification.
   - `m2_rev_2` (`teamwork_preview_reviewer`): Edge middleware, session tokens, Next.js 16 conventions, and admin console review.
   - `m2_chall_1` (`teamwork_preview_challenger`): Adversarial session forging, expired token penetration, privilege escalation challenge.
   - `m2_chall_2` (`teamwork_preview_challenger`): Boundary testing on admin account creation, duplicate emails, student profile linkage.
   - `m2_audit_1` (`teamwork_preview_auditor`): Forensic code integrity check against mock shortcuts, fake returns, or hardcoded passwords.
2. Evaluate Gate:
   - Record verdicts in `.agents/orchestrator_4/M2_GATE_STATUS.md`.
   - Ensure all Reviewers APPROVE, Challengers confirm robustness, and Auditor is CLEAN.
3. Certify Milestone 2 as DONE in `PROJECT.md`.

## Phase 2: Milestone 3 (Academic Domain & Primary Student Views)
1. Survey / Exploration:
   - Dispatch 3 Explorers:
     - `m3_exp_1`: Attendance Domain (`src/lib/attendance.ts`), TU 80% barometer, What-If calculator, safety buffer, and correction workflow.
     - `m3_exp_2`: Student Views (Dashboard `/`, Today `/today`, Subjects `/subjects` & `/subjects/[id]`, enrollment authorization).
     - `m3_exp_3`: Homework Workspace (`/homework`), UploadThing integration (`assignmentSubmission` router), submission modal, draft state, grades.
2. Implementation:
   - Synthesize explorer findings into `m3_plan.md`.
   - Dispatch `m3_worker_1` (`teamwork_preview_worker`): Implement domain service, client/server components, server actions, UploadThing router, and run `npx tsc --noEmit` & E2E tests.
3. Gate Verification:
   - Dispatch 2 Reviewers, 2 Challengers, 1 Auditor.
   - Record verdicts in `.agents/orchestrator_4/M3_GATE_STATUS.md`.
   - Certify Milestone 3 as DONE in `PROJECT.md`.

## Phase 3: Milestone 4 (Final E2E Suite Pass & Adversarial Hardening)
1. Phase 1 (E2E Test Pass Tiers 1-4):
   - Dispatch `m4_worker_1` to run the full Playwright E2E suite (`npx playwright test`).
   - Fix any edge failures if observed.
2. Phase 2 (Adversarial Coverage Hardening Tier 5):
   - Dispatch 2 Challengers for white-box gap analysis & edge-case stress verification.
   - Dispatch 1 Forensic Auditor for full repository integrity signoff.
3. Certify Milestone 4 as DONE in `PROJECT.md`.

## Phase 4: Final Synthesis & Sentinel Delivery
1. Generate final completion report.
2. Send message to Sentinel with full verification proofs and summary.
