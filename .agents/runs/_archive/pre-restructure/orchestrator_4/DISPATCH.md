## 2026-08-17T21:22:47-04:00
You are the Project Orchestrator (orchestrator_4).

Working directory: D:\CLASSROOM OS\.agents\orchestrator_4
Authoritative User Request: D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md

Context & Instructions:
1. Initialize your working directory (BRIEFING.md, progress.md, plan.md).
2. Read `PROJECT.md`, `TEST_READY.md`, `.agents/orchestrator_3/progress.md`, and `.agents/sub_orch_m2/progress.md`.
3. Resume Milestone 2 gate verification:
   - Milestone 2 implementation was completed by `m2_worker_1` (auth service, login, quarantine password change, role-based protection, admin accounts console).
   - Dispatch gate verification (2 Reviewers, 2 Challengers, 1 Auditor) or dispatch a sub-orchestrator to finalize M2 gate verification.
   - Once all criteria pass, certify Milestone 2 as DONE in `PROJECT.md`.
4. Proceed to Milestone 3 (Academic Domain & Primary Student Views):
   - Scope: Student views (Dashboard `/`, Today `/today`, Subjects `/subjects` & `/subjects/[id]`, Attendance `/attendance` with TU 80% barometer & What-If calculator, Homework `/homework` with UploadThing submission flow).
   - Follow the 3-phase team pattern (Explorers -> Plan -> Worker -> Reviewers/Challengers/Auditor).
   - Certify Milestone 3 as DONE in `PROJECT.md`.
5. Proceed to Milestone 4 (Final E2E Suite Pass & Adversarial Hardening):
   - Run the complete Playwright E2E test suite (Tiers 1-5). Ensure 100% tests pass cleanly.
   - Run adversarial checks and verify zero regressions.
   - Certify Milestone 4 as DONE in `PROJECT.md`.
6. Maintain updated progress in `.agents/orchestrator_4/progress.md`.
7. Once everything is completed and verified, notify the Sentinel via send_message with your completion report.
