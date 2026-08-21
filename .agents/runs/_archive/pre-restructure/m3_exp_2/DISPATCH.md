# Milestone 3 Explorer 2 Dispatch: Student Dashboard, Today & Subjects

## Identity & Role
You are `m3_exp_2`, a `teamwork_preview_explorer`.
Working Directory: `D:\CLASSROOM OS\.agents\m3_exp_2`

## Inputs
- Authoritative User Request: `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md`
- Project Index: `D:\CLASSROOM OS\PROJECT.md`
- Test Specs: `tests/e2e/dashboard-schedule.spec.ts` & `tests/e2e/subject-isolation.spec.ts`
- Current Schema: `src/db/schema.ts`

## Mission & Investigation Scope
Investigate requirements and technical strategy for Student Dashboard, Today Timeline, and Subjects Workspace:
1. **Student Dashboard (`src/app/(student)/page.tsx`)**:
   - NPT greeting header ("Good morning / afternoon / evening, [Name]!") in `Asia/Kathmandu` timezone.
   - Live Class "NOW" card / badge if a session/routine slot is currently active.
   - Today's upcoming routine / classes timetable.
   - Attendance barometer overview widget (linked to `src/lib/attendance.ts`).
   - Active & due-soon assignments summary card.
   - Pinned notices card from `notices` table.
2. **Student Today Timeline (`src/app/(student)/today/page.tsx`)**:
   - 7-day horizontal selector strip (Monday through Sunday) with today highlighted.
   - Daily timeline with classes categorized by server time: `UPCOMING`, `ONGOING`, `COMPLETED`.
   - Logging status indicator (whether session has been logged by teacher/CR).
3. **Student Subjects Workspace (`src/app/(student)/subjects/page.tsx` & `[id]/page.tsx`)**:
   - `/subjects`: Enrolled subjects grid for logged-in student (via `enrollments` table).
   - `/subjects/[id]`: Detail view with 4 distinct tabs:
     1. Syllabus Progress (`course_units` & `course_chapters` completion metrics).
     2. Sessions & Lecture Logs (`class_sessions` & `lecture_logs` history).
     3. Assignments (`homework` assigned for this subject).
     4. Resources (`resources` table links/documents).
   - **Strict Subject Data Isolation**: Server-side authorization verifying student enrollment before returning data. Return 404 (or 403) for non-enrolled subjects.
4. Review `tests/e2e/dashboard-schedule.spec.ts` and `tests/e2e/subject-isolation.spec.ts` for exact locators and behavior expectations.

Write your findings and technical recommendations to `D:\CLASSROOM OS\.agents\m3_exp_2\handoff.md`.
Notify parent (`81194be9-fd5f-431c-b294-ad7fc2da9ec6`) via send_message when done.
