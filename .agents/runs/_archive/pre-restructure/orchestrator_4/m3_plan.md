# Milestone 3 Unified Implementation Plan: Academic Domain & Primary Student Views

## Objectives
Implement and deliver the complete Student Academic Operating System domain and views:
1. **Attendance Domain Engine (`src/lib/attendance.ts`)**:
   - Centralized pure domain service implementing TU 80% formulas:
     - Missable buffer: $\lfloor 1.25A - T \rfloor$ (if $P \ge 80\%$, else 0).
     - Recovery target: $\max(0, 4T - 5A)$ (if $P < 80\%$, else 0).
     - Zone categorization: `SAFE` ($\ge 80\%$), `CAUTION` ($75\% \le P < 80\%$), `DANGER` ($P < 75\%$).
     - What-If projection calculator: `projectAttendance(attended, total, plannedAttended, plannedMissed)`.
2. **Attendance Hub (`src/app/(student)/attendance/`)**:
   - `page.tsx`: Overall semester barometer gauge, SAFE/CAUTION/DANGER chips, subject-wise attendance breakdown table, session history log.
   - `what-if-calculator.tsx`: Reactive client component with sliders (`data-testid="what-if-slider"`) and projected percentage display (`data-testid="what-if-projected-result"`).
   - `correction-dialog.tsx` & `actions.ts`: "Report Incorrect Attendance" modal submitting to `attendance_correction_requests`.
3. **Student Dashboard (`src/app/(student)/page.tsx`)**:
   - NPT greeting header ("Good morning/afternoon/evening, [Name]!").
   - Live Class "NOW" card with active pulse indicator.
   - Timetable with upcoming classes.
   - Attendance barometer overview widget (using `src/lib/attendance.ts`).
   - Active assignments summary card.
   - Pinned notices from `notices` table.
4. **Student Today Timeline (`src/app/(student)/today/page.tsx`)**:
   - 7-day horizontal selector strip with `data-testid="day-strip-btn"`.
   - Chronological timeline cards with explicit status badges: `UPCOMING`, `ONGOING`, `COMPLETED`.
5. **Student Subjects Workspace (`src/app/(student)/subjects/`)**:
   - `src/app/(student)/subjects/page.tsx`: Enrolled subjects grid (`data-testid="subject-card"`).
   - `src/app/(student)/subjects/[id]/page.tsx`: Subject detail workspace with 4 tabs:
     1. Syllabus Progress (`course_units` & `course_chapters`).
     2. Sessions & Lecture Logs (`class_sessions`, `lecture_logs`, "Topics Covered").
     3. Assignments (`homework` for this subject).
     4. Resources (`resources` table with "Materials" and download links).
   - Strict Subject Data Isolation: Server-side authorization verifying student enrollment; returns 404 / 403 for unauthorized access.
   - Update `src/components/student/student-sidebar.tsx` with `"Subjects"` link (`/subjects`).
6. **Homework Workspace & UploadThing Submissions (`src/app/(student)/homework/`)**:
   - `src/app/api/uploadthing/core.ts`: `assignmentSubmission` router (16MB max, PDF, ZIP, DOCX, Code, Images) with session user verification.
   - `src/app/(student)/homework/page.tsx` & `homework-client-workspace.tsx`:
     - 5 Filter Tabs: `Active`, `Due Soon` (within 48h), `Overdue`, `Submitted`, `Graded`.
     - Assignment detail & submission modal: text solution editor, file dropzone (`data-testid="file-upload-dropzone"`), draft saving (`status: "draft"`), turning in (`status: "submitted"` or `"late"`).
     - Graded feedback card (`data-testid="grade-feedback-card"`) with score, letter grade, and instructor feedback.
   - `src/app/(student)/homework/actions.ts`: `saveSubmissionDraftAction` and `submitAssignmentAction`.
7. **E2E Test Seeding Alignment (`scripts/seed-e2e.ts`)**:
   - Seed `enrollments` table linking `sp_student_001` to BCA subjects (`subj_dsa_001`, `subj_dbms_001`, `subj_wt_001`) and `sp_unauthorized_001` to CSIT subject (`subj_restricted_001`).

## Verification Requirements
- `npx tsc --noEmit` must pass with 0 errors.
- `npm run db:verify` must pass 31/31 suites.
- `npx playwright test tests/e2e/dashboard-schedule.spec.ts` must pass (9/9 tests).
- `npx playwright test tests/e2e/attendance-barometer.spec.ts` must pass (6/6 tests).
- `npx playwright test tests/e2e/homework-submissions.spec.ts` must pass (6/6 tests).
- `npx playwright test tests/e2e/subject-isolation.spec.ts` must pass (6/6 tests).
- `npx playwright test tests/e2e/auth-lifecycle.spec.ts` must pass (13/13 tests).
