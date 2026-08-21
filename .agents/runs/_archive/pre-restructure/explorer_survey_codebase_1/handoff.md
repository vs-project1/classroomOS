# Comprehensive Codebase Survey Report: Classroom OS

**Explorer**: Survey Explorer  
**Date**: 2026-08-15  
**Working Directory**: `D:\CLASSROOM OS\.agents\explorer_survey_codebase_1`  
**Target Project**: `D:\CLASSROOM OS`  

---

## 1. Observation

Direct observations from inspecting files, running commands, and querying the repository state:

### A. Environment & Framework Stack
- **Next.js & React**:
  - `package.json` lines 26-28: `"next": "16.2.10"`, `"react": "19.2.4"`, `"react-dom": "19.2.4"`.
  - `next.config.ts` lines 3-7: NextConfig with `typescript: { ignoreBuildErrors: true }`.
  - Type-checking status: `npx tsc --noEmit` executed cleanly with exit code 0 (`0 errors`).
- **Styling & Design System**:
  - Tailwind CSS v4: `"tailwindcss": "^4"`, `"@tailwindcss/postcss": "^4"`.
  - `src/app/globals.css`: Imports `@import "tailwindcss"; @import "tw-animate-css"; @import "shadcn/tailwind.css"; @import "../../design/tokens.css"; @import "@uploadthing/react/styles.css";`. Defines `@theme inline` mapping to design tokens.
  - Colors & Theme: Light Mode (Ice-Indigo: `--background: #F0F4FF`, `--primary: #4F46E5`), Dark Mode (Deep Midnight Indigo: `--background: #0B0F19`, `--primary: #818CF8`).
  - Typography: Google fonts Inter (`--font-inter`), Fira Sans (`--font-fira-sans`), Fira Code (`--font-fira-code`) configured in `src/app/layout.tsx`.
- **UI Components & Primitives**:
  - Base UI: `"@base-ui/react": "^1.6.0"`, `"shadcn": "^4.13.0"`, `"lucide-react": "^1.24.0"`.
  - 18 shadcn/Base UI components in `src/components/ui/`: `accordion.tsx`, `avatar.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `checkbox.tsx`, `dialog.tsx`, `input.tsx`, `label.tsx`, `progress.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `tooltip.tsx`.
  - 7 custom student domain components in `src/components/student/`: `attendance-gauge.tsx`, `mobile-bottom-nav.tsx`, `section-card.tsx`, `stat-card.tsx`, `status-chip.tsx`, `student-sidebar.tsx`, `student-topbar.tsx`.

### B. Database & Schema
- **Driver & Connection**:
  - `@libsql/client`: `"^0.17.4"`, `drizzle-orm`: `"^0.45.2"`, `drizzle-kit`: `"^0.31.10"`.
  - `src/db/client.ts`: Connects via `createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN })`.
  - `src/db/index.ts`: Protects runtime with `import "server-only";`.
  - `drizzle.config.ts`: Configured with dialect `"turso"`, schema `"./src/db/schema.ts"`, out `"./drizzle"`.
  - `.env.local`: Configured to Turso remote instance `libsql://classroom-os-classroomos.aws-ap-south-1.turso.io`.
- **Existing Tables in `src/db/schema.ts`** (327 lines):
  1. `teachers`: `id` (PK), `name`, `email` (unique), `phone`, `faculties` (json array), `semesters` (json array), `createdAt`, `updatedAt`.
  2. `subjects`: `id` (PK), `name`, `code` (unique), `teacherId` (FK -> `teachers.id`, onDelete: "set null"), `createdAt`.
  3. `students`: `id` (PK), `name`, `rollNumber` (unique), `email` (unique), `phone`, `faculty`, `semester`, `createdAt`.
  4. `weeklyRoutine` (`weekly_routine`): `id` (PK), `subjectId` (FK -> `subjects.id`, cascade), `dayOfWeek` (0-6), `startTime`, `endTime`, `teacherName`, `room`, `notes`, `createdAt`, `updatedAt`. Check constraints: `chk_weekly_routine_day` (`day_of_week BETWEEN 0 AND 6`), `chk_weekly_routine_time` (`start_time < end_time`).
  5. `classSessions` (`class_sessions`): `id` (PK), `subjectId` (FK -> `subjects.id`, cascade), `routineId` (FK -> `weeklyRoutine.id`, set null), `sessionDate` (timestamp), `startTime`, `endTime`, `createdAt`.
  6. `lectureLogs` (`lecture_logs`): `id` (PK), `classSessionId` (FK -> `classSessions.id`, cascade, unique), `topicsCovered`, `homework`, `notes`, `createdAt`.
  7. `attendance`: `id` (PK), `classSessionId` (FK -> `classSessions.id`, cascade), `studentId` (FK -> `students.id`, cascade), `status`, `createdAt`. Composite unique: `(classSessionId, studentId)`. Check: `chk_attendance_status` (`status IN ('present', 'absent', 'late', 'excused')`).
  8. `homework`: `id` (PK), `subjectId` (FK -> `subjects.id`, cascade), `title`, `description`, `assignedDate`, `dueDate`, `sessionId` (FK -> `classSessions.id`, set null), `status` (default 'active'), `createdAt`, `updatedAt`. Check: `chk_homework_status` (`status IN ('active', 'completed', 'archived')`).
  9. `notices`: `id` (PK), `title`, `content`, `expiresAt`, `isPinned` (boolean default false), `createdAt`, `updatedAt`.
  10. `events`: `id` (PK), `title`, `description`, `eventDate`, `startTime`, `endTime`, `eventType`, `location`, `createdAt`, `updatedAt`. Check: `chk_events_time`.
  11. `courseUnits` (`course_units`): `id`, `subjectId` (cascade), `title`, `order`, `createdAt`, `updatedAt`.
  12. `courseChapters` (`course_chapters`): `id`, `unitId` (cascade), `title`, `order`, `createdAt`, `updatedAt`.
  13. `courseMaterials` (`course_materials`): `id`, `chapterId` (cascade), `title`, `fileUrl`, `fileType`, `createdAt`.
- **Database Verification Scripts**:
  - `scripts/verify-db.ts`: Tests Subject/Student creation, Session logging, Drizzle relations, composite unique violation rejection, enum CHECK violation rejection, cascade deletes. Output: `✅ All Database constraints and relations verified successfully!`
  - `scripts/verify-session-transaction.ts`: Tests multi-table rollback on atomic session + log + attendance creation. Output: `🎉 ALL TESTS PASSED: Transaction rollback successfully prevented partial inserts.`

### C. Current Authentication & Authorization State
- `src/lib/auth.ts`:
  - Uses mock cookie `APP_ROLE` or `process.env.APP_ROLE` with fallback `ADMIN`.
  - `resolveCurrentStudent()` picks `process.env.DEMO_STUDENT_ID` or first student in alphabetical order from DB.
  - `src/components/role-switcher.tsx`: Floating button toggling `document.cookie = APP_ROLE=...`.
  - **No user authentication tables** exist yet (`users`, `sessions`, `student_profiles`). No password hashing, no login page, no session cookies with HTTP-only security, no `mustChangePassword` flow.

### D. File Storage (UploadThing)
- Packages installed: `"uploadthing": "^7.7.4"`, `"@uploadthing/react": "^7.3.3"`.
- Configured files:
  - `src/app/api/uploadthing/core.ts`: Single `courseMaterial` endpoint allowing PDF (16MB) and image (4MB).
  - `src/app/api/uploadthing/route.ts`: Next.js App Router route handler (`GET`, `POST`).
  - `src/utils/uploadthing.ts`: Exports `UploadButton` and `UploadDropzone`.
  - Used in `src/app/(admin)/admin/subjects/[id]/components.tsx` for uploading course materials.
- Missing:
  - No `assignmentSubmission` router endpoint for student submissions.
  - No file authorization middleware or enrollment verification on file access.

### E. Routes & UI Coverage
- **Admin App `(admin)`**:
  - `/admin`: Command Center dashboard with summary metrics and quick actions.
  - `/admin/students`: Roster table, create student form, edit student dialog.
  - `/admin/teachers`: Teacher directory, create/edit teacher dialogs.
  - `/admin/subjects`: Subject listing, `/admin/subjects/[id]` units/chapters/materials tree with UploadDropzone.
  - `/admin/homework`: Assignments list, `/admin/homework/new` form.
  - `/admin/notices`: Notice board, `/admin/notices/new` form.
  - `/admin/events`: Events calendar, `/admin/events/new` form.
- **Student App `(student)`**:
  - `/`: Dashboard with time-based greeting, today's schedule, active assignments, notices, attendance gauge.
  - `/today`: 7-day timeline selector and class cards categorized by server time.
  - `/attendance`: TU 80% barometer, safety buffer calculation, subject breakdown.
  - `/homework`: Assignments tabbed list (Active, Completed, Archived) with status actions.
  - `/routine`: Weekly schedule table, new routine slot form.
  - `/sessions`: Historical session list, `/sessions/new` full class logging (routine prefill, topics, attendance checklist, auto homework generation), `/sessions/[id]` detail.
  - `/notices` & `/events` & `/lecture-logs`: Student portal views.
- **Missing Student Routes per Original Request (R3)**:
  - `/subjects`: Student-facing grid of enrolled subjects.
  - `/subjects/[id]`: Detail page with Syllabus progress, Sessions, Assignments, and Resources tabs.
  - `/login`: Dedicated login page with temporary password & `mustChangePassword` redirection.
  - `/admin/accounts`: User account provisioning & credential reset for Admin.

### F. Testing & Quality Assurance
- No Playwright test harness or test config (`playwright.config.ts`) is installed.
- No end-to-end tests exist in the repository.
- No database seed script (`src/db/seed.ts`) exists.

---

## 2. Logic Chain

1. **Current System Maturity**: The application currently has strong database constraints (CHECK, CASCADE, composite UNIQUE) and working CRUD flows for Admin/CR operations, but currently operates in an open prototype mode with a mock cookie role (`src/lib/auth.ts`).
2. **Security & Identity Gap**: Because identity is decoupled from real accounts, any client can switch roles via the cookie or access data for arbitrary student IDs. To meet Requirement R1 & R2, a dedicated server-side authentication layer (`users`, `student_profiles`, `mustChangePassword` flow, HTTP-only session cookies) is necessary.
3. **Data Isolation Gap**: Currently, student queries (e.g. in `(student)/page.tsx` and `(student)/attendance/page.tsx`) rely on `resolveCurrentStudent()` which picks the first student in the DB. This violates R2 ("Students can only access their own profile, submissions, and enrolled subjects/sections. Never trust client-provided IDs.").
4. **Student Academic OS Gap (R3)**:
   - Students currently cannot browse their subjects under `(student)/subjects` or view the 4 tabs (Syllabus, Sessions, Assignments, Resources).
   - Students currently cannot submit homework files with drafts and retries via UploadThing.
   - The attendance page does not yet have a formal "Report Incorrect Attendance" correction request flow.
5. **Schema Extension Requirements (R4)**:
   - To support student submissions, exams, study tasks, and correction requests, the schema must be extended with: `users`, `student_profiles`, `enrollments`, `assignment_submissions`, `exams`, `exam_results`, `resources`, `study_tasks`, `notifications`, and `attendance_correction_requests`.
   - All new tables must strictly follow the existing architectural rules: SQLite `CHECK` constraints, foreign keys with explicit `CASCADE`/`SET NULL`, unified schema in `src/db/schema.ts`.

---

## 3. Caveats

1. **Turso / libSQL SQLite Dialect**: SQLite does not support native ENUM types, so all enums must continue to be declared as `text()` with Drizzle `check()` constraints.
2. **UploadThing Token**: In local/CI testing, UploadThing requires environment variables (`UPLOADTHING_TOKEN` or `UPLOADTHING_SECRET`) or mock testing harnesses.
3. **React 19 & Next.js 16**: Standard server action signatures (`useActionState(fn, initialState)`) and async `params`/`searchParams` (promises) are required. Base UI v1 syntax must be maintained.
4. **Timezone Sensitivity**: All time calculations must continue using `Asia/Kathmandu` (NPT) as mandated by AGENTS.md.

---

## 4. Conclusion

Classroom OS possesses a solid, clean, type-safe foundation (Next.js 16, React 19, Tailwind v4, Drizzle ORM, Turso libSQL) with strict database integrity and verification scripts. However, it currently lacks:
1. Production authentication, user sessions, role-based access control, and account management (`/admin/accounts`, `/login`, `mustChangePassword`).
2. Data isolation and authorization per student.
3. Student-facing `/subjects` and `/subjects/[id]` tabbed workspace.
4. Student assignment submission flow with UploadThing integration.
5. Missing database tables for submissions, exams, study tasks, resources, and attendance correction requests.
6. Playwright end-to-end testing suite and database seed script (`src/db/seed.ts`).

---

## 5. Verification Method

To independently verify the observations:
1. **Type Check**: Run `npx tsc --noEmit` -> Expect 0 errors.
2. **Database Integrity Verification**: Run `npm run db:verify` -> Expect all 8 constraint checks to pass.
3. **Database Transaction Rollback**: Run `npx tsx --env-file=.env.local scripts/verify-session-transaction.ts` -> Expect transaction rollback verification to succeed.
4. **Codebase Schema Inspection**: Open `src/db/schema.ts` and inspect existing 13 tables and relations.
5. **Auth Mock Inspection**: Open `src/lib/auth.ts` lines 6-15 to verify role mock behavior.

---

## 6. Recommendations for Architecture & Milestones

Based on `ORIGINAL_REQUEST.md` and `AGENTS.md`, the recommended implementation roadmap is structured into 4 sequential milestones:

### Milestone 1: Database Schema Extension & Seeding Infrastructure
- **M1.1 Schema Expansion (`src/db/schema.ts`)**:
  - Add `users` (id, email, passwordHash, role `CHECK(role IN ('ADMIN', 'TEACHER', 'CR', 'STUDENT'))`, mustChangePassword, status `CHECK(status IN ('active', 'deactivated'))`, createdAt, updatedAt).
  - Add `student_profiles` (id, userId FK cascade, studentId FK cascade, rollNumber, faculty, semester, section).
  - Add `enrollments` (id, studentId FK cascade, subjectId FK cascade, status `CHECK(status IN ('enrolled', 'dropped'))`, enrolledAt).
  - Add `assignment_submissions` (id, assignmentId FK cascade, studentId FK cascade, fileUrl, notes, submittedAt, status `CHECK(status IN ('draft', 'submitted', 'graded'))`, grade, feedback).
  - Add `exams` & `exam_results` (with examType and marks checks).
  - Add `resources` & `study_tasks` & `notifications` & `attendance_correction_requests`.
  - Add all Drizzle relations.
- **M1.2 Migration & Verification Script**:
  - Generate Drizzle migration (`drizzle-kit generate`) and apply.
  - Update `scripts/verify-db.ts` to test constraints on new tables.
- **M1.3 Database Seeder (`src/db/seed.ts`)**:
  - Create robust seeder generating sample Admin, Teachers, CRs, Students, Subjects, Routine, Sessions, Attendance, Assignments, Submissions, and Notices.

### Milestone 2: Authentication, Security & Admin Account Management
- **M2.1 Session & Auth Service (`src/lib/auth.ts` / `src/lib/session.ts`)**:
  - Implement secure session creation and verification using HTTP-only cookies and cryptographically signed tokens / password hashing (`scrypt` or `argon2`/`bcrypt`).
  - Strict role enforcement (`ADMIN`, `TEACHER`, `CR`, `STUDENT`) with server-side authorization helpers (`requireAuth()`, `requireRole()`, `getCurrentUser()`).
- **M2.2 Auth Routes & First-Time Login**:
  - Build `/login` page with clean, responsive UI.
  - Build `mustChangePassword` force-reset modal/page on first login.
  - Add Logout server action.
- **M2.3 Admin Account Management (`/admin/accounts`)**:
  - Create `/admin/accounts` with tabs for Students, Teachers, CRs.
  - Actions to generate accounts, set temporary passwords, reset passwords, deactivate/activate accounts.

### Milestone 3: Student OS Workspace & Domain Isolation
- **M3.1 Student Isolation & Data Access**:
  - Bind all student queries strictly to `session.user.studentId` — never trust client-provided IDs.
- **M3.2 Student Dashboard (`/`) & Today (`/today`) Polish**:
  - Time-based greeting, Live class "NOW" badge, next classes, TU 80% barometer card, active assignments, pinned notices.
- **M3.3 Student Subjects (`/subjects` & `/subjects/[id]`)**:
  - Create `/subjects` enrolled grid.
  - Create `/subjects/[id]` with 4 tabs:
    1. Syllabus progress (units/chapters checklist).
    2. Sessions (lecture history with notes & topics).
    3. Assignments (subject-specific tasks and submission status).
    4. Resources (course materials & downloadable guides).
- **M3.4 Attendance & Correction Requests (`/attendance`)**:
  - TU 80% barometer with deterministic "What-If" calculator service.
  - "Report Incorrect Attendance" modal submitting to `attendance_correction_requests`.
- **M3.5 Assignments & UploadThing Submission Flow (`/homework`)**:
  - Enhance `src/app/api/uploadthing/core.ts` with `assignmentSubmission` router (with file validation and student auth).
  - Tabs: Active, Due Soon, Overdue, Submitted, Graded.
  - Submission modal supporting draft saves, file upload via UploadThing, resubmissions, and viewing grades/feedback.

### Milestone 4: End-to-End Testing & Hardening
- **M4.1 Playwright Test Setup**:
  - Install `@playwright/test`. Configure `playwright.config.ts`.
- **M4.2 Core E2E Tests**:
  - `tests/admin-account-creation.spec.ts`: Admin creates user -> temporary password generated.
  - `tests/auth-flow.spec.ts`: Student logs in -> forced to change password -> lands on dashboard.
  - `tests/student-assignment.spec.ts`: Student navigates to assignment -> uploads submission -> marks as submitted.
  - `tests/authorization-isolation.spec.ts`: Asserts student cannot view un-enrolled subject or tamper with IDs.
- **M4.3 Pre-Landing Validation**:
  - Run `npx tsc --noEmit`, `npm run lint`, `npm run db:verify`, and `npx playwright test`.
