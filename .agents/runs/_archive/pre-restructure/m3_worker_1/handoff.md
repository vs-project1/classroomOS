# Milestone 3 Implementation & Quality Assurance Handoff Report

## 1. Observation
- **Assignment**: Complete all Milestone 3 features for Classroom OS: Attendance Domain Engine, Attendance Hub with What-If Simulator & Dispute Flow, Student Dashboard, Today Schedule Timeline with 7-Day navigation, Student Subjects Workspace with strict multi-tenant authorization, and Homework & Assignment Workspace with UploadThing file attachments, drafts, and grading cards.
- **Observed Source Implementations**:
  - `src/lib/attendance.ts`: Mathematical TU 80% attendance engine implementing:
    - Missable classes buffer: $\lfloor 1.25A - T \rfloor$ for $P \ge 80\%$, else 0.
    - Classes needed to recover: $\max(0, 4T - 5A)$ for $P < 80\%$, else 0.
    - Risk categories: `SAFE` ($\ge 80\%$), `CAUTION` ($75\% \le P < 80\%$), `DANGER` ($P < 75\%$).
    - What-If simulator: `projectAttendance(attended, total, plannedAttended, plannedMissed)`.
  - `src/app/(student)/attendance/*`:
    - Attendance barometer SVG gauge with color-coded arc.
    - Interactive `WhatIfCalculator` with live range inputs.
    - Base UI modal `CorrectionDialog` connected to Server Action `submitAttendanceCorrectionAction` inserting into `attendance_correction_requests`.
    - Subject breakdown matrix with present/total and safety buffers.
  - `src/app/(student)/page.tsx`:
    - Personalized greeting based on NPT time (`Asia/Kathmandu`).
    - Attendance summary gauge, Today's Timetable, Active Assignments card, and Pinned Notices board.
  - `src/app/(student)/today/*`:
    - Horizontal 7-day date selector (`DayStripSelector`) with `data-testid="day-strip-btn"`.
    - Chronological class sessions with uppercase status tags (`UPCOMING`, `ONGOING`, `COMPLETED`).
  - `src/app/(student)/subjects/*`:
    - Subject cards grid (`/subjects`) with `data-testid="subject-card"`.
    - 4-tab authorized workspace (`/subjects/[id]`): Syllabus Progress, Lecture Logs & Sessions with "Topics Covered", Assignments, and Downloadable Resources.
    - Strict enrollment authorization check throwing 403 Forbidden for un-enrolled students (`TC-SPEC-SUBJ-04`).
  - `src/app/(student)/homework/*`:
    - 5 filter tabs: `Active`, `Due Soon`, `Overdue`, `Submitted`, `Graded`.
    - Modal dialog supporting draft saving (`saveSubmissionDraftAction`) and submission (`submitAssignmentAction`).
    - UploadThing router `assignmentSubmission` with 16MB file limit in `src/app/api/uploadthing/core.ts`.
    - Graded card displaying score, letter grade badge, and teacher feedback (`TC-SPEC-HW-06`).
    - Security isolation on `/homework/submissions/[id]` strictly denying access to foreign submissions (`TC-SPEC-SUBJ-06`).
  - `scripts/seed-e2e.ts`:
    - Multi-tenant enrollments, graded submissions, and subject resources seeded deterministically.

## 2. Logic Chain
1. **Mathematical Accuracy**: Tribhuvan University attendance policy strictly mandates an 80% threshold. Calculating percentage as $(A/T) \times 100$, missable classes as $\lfloor 1.25A - T \rfloor$, and recovery classes as $\max(0, 4T - 5A)$ ensures exact mathematical adherence without boundary drift.
2. **Security & Authorization**: In university multi-tenancy, students must only view academic materials and sessions for enrolled subjects. By validating against `enrollments` table in Server Components and checking submission ownership on direct URLs, unauthorized cross-student access is strictly rejected (403 Forbidden).
3. **State Management & React 19 Standards**: All mutations are executed through React 19 Server Actions with `useActionState` and Zod schema validation, ensuring consistent state contracts (`{ success, message, fieldErrors }`).
4. **Timezone Fidelity**: Standardizing all date formatting to `Asia/Kathmandu` ensures time-based greetings and timeline indicators correctly reflect Nepal Standard Time without UTC shift errors.

## 3. Caveats
- UploadThing interactions in E2E testing are mocked via Playwright network route interception (`tests/fixtures/upload-mock.ts`), allowing fast, deterministic CI execution without requiring active UploadThing cloud credentials.
- Base UI modal popups require constrained maximum height (`max-h-[85vh] overflow-y-auto`) to guarantee viewport stability during headless browser interactions.

## 4. Conclusion
All Milestone 3 deliverables are fully implemented, strictly type-safe, genuinely connected to SQLite database schema, and passing 100% of automated Playwright test suites.

## 5. Verification Method
- **Type Checking**:
  ```bash
  npx tsc --noEmit
  ```
  *Result*: Exited with code 0 (0 errors).
- **Database Schema & Constraints**:
  ```bash
  npm run db:verify
  ```
  *Result*: 31/31 suites passed (0 failures).
- **Playwright E2E Test Suites**:
  ```bash
  npx playwright test tests/e2e/attendance-barometer.spec.ts
  npx playwright test tests/e2e/dashboard-schedule.spec.ts
  npx playwright test tests/e2e/subject-isolation.spec.ts
  npx playwright test tests/e2e/homework-submissions.spec.ts
  npx playwright test tests/e2e/auth-lifecycle.spec.ts
  ```
  *Results*:
  - `attendance-barometer.spec.ts`: 6/6 passed.
  - `dashboard-schedule.spec.ts`: 9/9 passed.
  - `subject-isolation.spec.ts`: 6/6 passed.
  - `homework-submissions.spec.ts`: 6/6 passed.
  - `auth-lifecycle.spec.ts`: 13/13 passed.
