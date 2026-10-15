# Database Schema Unification & Multi-Section Hardened Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Follow `executing-plans` and `PROJECTS.md`. Checkbox (`- [ ]`) syntax marks progress.

**Goal:** Execute the Council-Hardened Database Schema Unification (Milestone M7) with zero data loss, zero-downtime session protection, multi-section scalability, and 100% type safety.

**Tech Stack:** Next.js 15 App Router, React 19, Drizzle ORM, LibSQL/SQLite, TypeScript strict mode.

---

## Bite-Sized Task Breakdown

### Phase 1: Schema & Relations Definition
- [ ] **Task 1.1: Update `src/db/schema.ts`**
  - Update `students`: `userId` (RESTRICT, unique, not null), `semester` (integer 1-8), `section`, `batchYear`, drop duplicate `idx_students_user_id`, add `idx_students_cohort`.
  - Update `weeklyRoutine`: `teacherId` (references `teachers.id`, set null), nullable `subjectId`, `slotType`, `customTitle`, `section`.
  - Update `dailySessions`: add `section`, unique constraint `(date, semester, section)`.
  - Update `semesterTelegramConfigs`: add `section`, unique constraint `(semester, section)`.
  - Update `resources`: `uploadedBy` references `users.id` (set null), cascade `unitId` and `chapterId`.
  - Update `notices` and `events`: add `createdById` (references `users.id`, set null) + missing indexes.
  - Remove table definitions for `studentProfiles`, `courseMaterials`, and legacy `attendance`.
  - Update all Drizzle relations (`usersRelations`, `studentsRelations`, `weeklyRoutineRelations`, `teachersRelations`, `resourcesRelations`, `dailyAttendanceRelations`, etc.).
  - *Verification command:* `npx tsc --noEmit` (track expected call-site errors).

### Phase 2: Auth Session & Identity Resolution
- [ ] **Task 2.1: Update `src/lib/auth/session.ts` and `src/lib/auth/index.ts`**
  - Replace `studentProfileId?: string` with `studentId?: string` in `SessionUser`.
  - Update `getCurrentUser()` to query `students` directly by `userId`.
- [ ] **Task 2.2: Refactor all `user.studentProfileId` Call-Sites (~35 locations)**
  - Update `today/queries.ts`, `homework/page.tsx`, `homework/submissions/[id]/page.tsx`, `lecture-logs/page.tsx`, `profile/page.tsx`, `profile/actions.ts`, `subjects/page.tsx`, `subjects/[slug]/page.tsx`, `attendance/actions/daily.ts`, `attendance/actions/dispute.ts`, `resources/queries.ts`, `routine/queries.ts`, `files/authz.ts`, `users/actions/accounts.ts`, `users/actions/student-actions.ts`.
- [ ] **Task 2.3: Simplify Assignment & File Auth Lookups**
  - In `src/features/assignments/actions/assignments.ts`, eliminate the 3-step `resolveCurrentStudentId()` fallback; return `user.studentId`.
  - *Verification command:* `npx tsc --noEmit`.

### Phase 3: Timetable Routine & Multi-Section Refactor
- [ ] **Task 3.1: Update Routine Actions (`src/features/routine/actions/routine-actions.ts`)**
  - Accept `teacherId`, `slotType`, `customTitle`, `section`.
  - Update `checkOverlap()` to check `teacherId` equality and `section` match.
  - Remove legacy `attendance` delete calls.
- [ ] **Task 3.2: Update Routine Form UI (`src/features/routine/components/routine-form.tsx`)**
  - Render a `<Select>` dropdown for teachers passed from server.
- [ ] **Task 3.3: Update Routine Queries (`src/features/routine/queries.ts`) & Presentation**
  - Update `getTeacherTodaySchedule` and `getTeacherWeeklyRoutine` to query `weeklyRoutine.teacherId === teacherId`.
  - Update `routine-view.tsx` precedence: `slot.teacher?.name ?? slot.subject?.teacher?.name`.
  - Update `telegram-brief-service.ts` to read `slot.teacher?.name`.
  - *Verification command:* `npx tsc --noEmit`.

### Phase 4: Attendance Actions & Multi-Section Guardrails
- [ ] **Task 4.1: Update Daily Attendance (`src/features/attendance/actions/daily.ts`)**
  - Accept and store `section` on `dailySessions`.
  - Add CR cohort validation: assert all submitted `studentId`s belong to CR's semester and section.
  - Replace `delete(dailyAttendance)` with individual `onConflictDoUpdate` to protect `attendance_correction_requests`.
- [ ] **Task 4.2: Update Lecture Session Logging (`src/features/sessions/actions/session-actions.ts`)**
  - Allow teachers to log sessions if they match `subjects.teacherId` OR `weeklyRoutine.teacherId`.
  - Remove atomic inserts to legacy `attendance` table.
  - *Verification command:* `npx tsc --noEmit`.

### Phase 5: Syllabus & Course Materials Consolidation
- [ ] **Task 5.1: Update Syllabus Actions (`src/features/subjects/actions/syllabus.ts`)**
  - Repoint chapter material additions to `resources` table.
- [ ] **Task 5.2: Update Subject Tabs UI (`src/features/subjects/components/tabs/`)**
  - Query and render `chapter.resources` instead of `chapter.courseMaterials`.
  - *Verification command:* `npx tsc --noEmit`.

### Phase 6: Notices & Events Author Tracking
- [ ] **Task 6.1: Update Notice & Event Actions**
  - In `createNotice` and `createEvent`, pass `createdById: user.id`.
  - *Verification command:* `npx tsc --noEmit`.

### Phase 7: Seed Script Realignment
- [ ] **Task 7.1: Update `src/db/seed.ts`**
  - Seed unified `students` with `userId`, `semester: 2`, `section: "A"`, `batchYear: 2025`.
  - Seed `weeklyRoutine` slots with `teacherId` foreign keys (`tch_nikunja_05`, `tch_ashish_06`, etc.) and `section: "A"`.
  - Remove seeding for `studentProfiles`, `courseMaterials`, and `attendance`.

### Phase 8: Bulletproof Migration Script (`migrate-schema-sync.ts`)
- [ ] **Task 8.1: Implement Council-Approved Migration Protocol in `scripts/maintenance/migrate-schema-sync.ts`**
  - Execute `PRAGMA foreign_keys = OFF;` outside transaction.
  - Invalidate stale sessions: `DELETE FROM sessions;`.
  - Pre-flight row count baseline checks.
  - Recreate `students` with true INTEGER affinity and backfill from `student_profiles` and `users`.
  - Add `section`, `slot_type`, `custom_title`, `teacher_id` to `weekly_routine`.
  - Add `section` to `daily_sessions` and `semester_telegram_configs`.
  - Add `created_by_id` to `notices` and `events`.
  - Update `resources.uploaded_by` foreign key.
  - Recreate performance indexes.
  - Run `PRAGMA foreign_key_check;`.
  - Post-flight zero-data-loss count assertions.
  - Restore `PRAGMA foreign_keys = ON;`.
  - Test migration execution: `npm run db:sync`.

### Phase 9: Verification & Milestone Closeout
- [ ] **Task 9.1: Zero-Regression Typecheck Verification (`npx tsc --noEmit`)**
- [ ] **Task 9.2: Production Pre-Commit & Staged Audit (`npm run pre-commit:audit`)**
- [ ] **Task 9.3: Multi-Role Verification (Teacher, Student, CR, Admin)**
- [ ] **Task 9.4: Update `LEARNINGS.md` & `PROJECTS.md` (Milestone M7 `COMPLETED`)**
