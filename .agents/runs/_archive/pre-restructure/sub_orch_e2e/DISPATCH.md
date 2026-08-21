## 2026-08-15T12:42:52Z

<USER_REQUEST>
You are the E2E Testing Orchestrator for Classroom OS.
Your working directory is: D:\CLASSROOM OS\.agents\sub_orch_e2e

You MUST read:
- D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md
- D:\CLASSROOM OS\PROJECT.md
- D:\CLASSROOM OS\AGENTS.md
- D:\CLASSROOM OS\.agents\AGENTS.md

Your scope (E2E Testing Track):
Implement F18 and F19:
1. Design and establish `TEST_INFRA.md` at project root following the 4-tier test case methodology (Category-Partition, BVA, Pairwise Combinatorial, Real-World Workloads):
   - Tier 1: Feature Coverage (>=5 per feature)
   - Tier 2: Boundary & Corner Cases (>=5 per feature)
   - Tier 3: Cross-Feature Combinations
   - Tier 4: Real-World Application Scenarios
2. Set up Playwright test framework:
   - Configure `playwright.config.ts` (webServer pointing to `npm run dev` or local server, browser configs, auth fixture helpers).
   - Add test runner scripts to `package.json` if needed.
3. Write comprehensive, opaque-box Playwright test suites in `tests/e2e/`:
   - `auth-lifecycle.spec.ts`: Admin creates student account -> temporary password generated -> Student logs in with temp password -> forced to `/change-password` -> updates password -> lands on dashboard -> `mustChangePassword` is now false.
   - `dashboard-schedule.spec.ts`: NPT time-based greeting, Live class "NOW" badge, schedule timeline, navigation to `/routine` and `/today`.
   - `attendance-barometer.spec.ts`: TU 80% barometer rendering, Safe/Caution/Danger status chips, interactive What-If calculation, "Report Incorrect Attendance" dispute flow.
   - `homework-submissions.spec.ts`: Tabs (Active, Due Soon, Overdue, Submitted, Graded), draft saving, file attachment/submission, grading feedback.
   - `subject-isolation.spec.ts`: Enrolled subject grid, 4 tabs (Syllabus, Sessions, Assignments, Resources), and assertion that accessing un-enrolled subject ID returns 404 / Forbidden.
4. When test suite and infrastructure are fully written and verified, create `TEST_READY.md` at project root with test command and coverage summary.
5. Send a completion message to parent.
</USER_REQUEST>
