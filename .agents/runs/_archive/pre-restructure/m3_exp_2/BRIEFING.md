# BRIEFING — 2026-08-17T22:05:00Z

## Mission
Investigate Student Dashboard (`/`), Today Timeline (`/today`), and Subjects Workspace (`/subjects` and `/subjects/[id]`) with strict student enrollment authorization/data isolation for Milestone 3.

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: investigation, synthesis
- Working directory: D:\CLASSROOM OS\.agents\m3_exp_2
- Original parent: 81194be9-fd5f-431c-b294-ad7fc2da9ec6
- Milestone: Milestone 3

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Follow Next.js 15 / React 19 rules and Classroom OS architectural rules
- All findings must have an evidence chain with exact file paths and line numbers
- Write report to D:\CLASSROOM OS\.agents\m3_exp_2\handoff.md and notify parent

## Current Parent
- Conversation ID: 81194be9-fd5f-431c-b294-ad7fc2da9ec6
- Updated: 2026-08-17T22:05:00Z

## Investigation State
- **Explored paths**:
  - `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md` (lines 1-106)
  - `D:\CLASSROOM OS\PROJECT.md` (lines 1-182)
  - `D:\CLASSROOM OS\src\db\schema.ts` (lines 1-795)
  - `tests/e2e/dashboard-schedule.spec.ts` (lines 1-88)
  - `tests/e2e/subject-isolation.spec.ts` (lines 1-78)
  - `tests/fixtures/pom/dashboard.page.ts`, `today.page.ts`, `subjects.page.ts`
  - `tests/fixtures/seed-data.ts`, `auth.fixture.ts`, `global-setup.ts`
  - `scripts/seed-e2e.ts` (lines 1-288) & `src/db/seed.ts` (lines 1-905)
  - `src/app/(student)/page.tsx` (lines 1-373)
  - `src/app/(student)/today/page.tsx` (lines 1-269)
  - `src/app/(student)/attendance/page.tsx`
  - `src/components/student/student-sidebar.tsx`
  - `src/lib/auth/session.ts` & `src/lib/auth/index.ts`
- **Key findings**:
  1. Student Dashboard (`/`): Exists but needs integration with domain service `src/lib/attendance.ts` and alignment with `DashboardPage` POM locators.
  2. Today Timeline (`/today`): Missing explicit uppercase status badges (`UPCOMING`, `ONGOING`, `COMPLETED`) and `data-testid="day-strip-btn"` on 7-day strip items.
  3. Subjects Workspace: `src/app/(student)/subjects/` does not exist yet. Must build `/subjects` (enrolled grid) and `/subjects/[id]` (4 tabs: Syllabus, Sessions, Assignments, Resources).
  4. Data Isolation: Must enforce server-side student enrollment verification via `enrollments` table; reject unauthorized access with 404/403.
  5. Attendance Domain Service: `src/lib/attendance.ts` needs to be created with pure calculation functions (`calculateAttendanceMetrics`, `projectAttendance`).
  6. E2E Seed: `scripts/seed-e2e.ts` is missing `enrollments` table rows for test students (`sp_student_001` vs `sp_unauthorized_001`), which will cause isolation tests to fail if not added.
  7. Navigation: `student-sidebar.tsx` needs "Subjects" item (`/subjects`).
- **Unexplored areas**: None for M3 explorer 2 scope.

## Key Decisions Made
- Fully analyzed all UI components, routing structures, database queries, and test assertions for Student Dashboard, Today Timeline, Subjects Workspace, and Data Isolation.

## Artifact Index
- D:\CLASSROOM OS\.agents\m3_exp_2\handoff.md — Technical exploration report
