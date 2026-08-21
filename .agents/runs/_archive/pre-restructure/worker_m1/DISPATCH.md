## 2026-08-18T14:35:12Z

Read ORIGINAL_REQUEST.md at D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md.
Read PROJECT.md at D:\CLASSROOM OS\PROJECT.md.
Read Explorer 1 handoff at D:\CLASSROOM OS\.agents\explorer_survey_1\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your working directory is: D:\CLASSROOM OS\.agents\worker_m1
Your task is to implement Milestone 1: Navigation & Layout Architecture:
1. In `src/components/student/mobile-navbar.tsx`:
   - Rename label "Homework" to "Assignments" with url "/homework" and Book icon (per Rule 5 in AGENTS.md).
   - Add { title: "Logs", url: "/lecture-logs", icon: FileText } to ensure parity with StudentSidebar.
   - Verify sticky top-16 z-20 layout, smooth horizontal pill scrolling, active state highlights, and no layout shifts.
2. In `src/app/(admin)/admin/page.tsx`:
   - Fix quick action and recent activity links pointing to student routes (`/notices` -> `/admin/notices`, `/homework` -> `/admin/homework`, `/events` -> `/admin/events`).
3. In `src/app/(admin)/admin/homework/page.tsx`:
   - Fix `/homework/new` -> `/admin/homework/new`.
4. In `src/app/(admin)/admin/notices/page.tsx`:
   - Fix `/notices/new` -> `/admin/notices/new`.
5. In `src/app/(admin)/admin/events/page.tsx`:
   - Fix `/events/new` -> `/admin/events/new`.
6. In `src/app/(admin)/admin/subjects/page.tsx`:
   - Fix `/subjects/${subject.id}` -> `/admin/subjects/${subject.id}`.
7. Run `npx tsc --noEmit` to verify type cleanliness (0 errors).
8. Write your completion report to `D:\CLASSROOM OS\.agents\worker_m1\handoff.md` with build & test verification commands.
