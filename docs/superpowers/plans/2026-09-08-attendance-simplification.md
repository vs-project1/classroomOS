# Attendance Simplification & Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish Daily Attendance as the single canonical source of truth for all attendance in ClassroomOS, eliminate subject-wise lecture attendance, streamline session logging, and standardize all user-facing copy to "Attendance".

**Architecture:** Daily attendance (`daily_sessions` and `daily_attendance`) becomes the sole data layer for student presence, 80% TU exam eligibility, and disputes (`attendance_correction_requests`). Lecture sessions (`class_sessions` and `lecture_logs`) are decoupled from student attendance checklists to become pure academic curriculum progress logs.

**Tech Stack:** Next.js 15 (App Router, Server Components & Server Actions), React 19, TypeScript, Drizzle ORM, SQLite / LibSQL, Tailwind CSS, Lucide icons, `@/lib/nepali-date`.

## Global Constraints
- **Zero Push to Remote:** Absolutely NO `git push` or remote deployment triggers (Render is connected to remote GitHub). All changes remain strictly in local environment.
- **Terminology:** Eliminate all instances of "Roll Call", "Morning Roll Call", and "Subject-wise Attendance". Use simply "Attendance" / "Take Attendance".
- **Zero Dead Code:** Proactively delete obsolete components, unused queries, and orphaned types.
- **Zero Regression Typecheck:** Every task must maintain `npx tsc --noEmit` with 0 errors.

---

### Task 1: Schema & Data Model Alignment

**Files:**
- Modify: `src/db/schema.ts:474-503` (update `attendanceCorrectionRequests` FK)

**Interfaces:**
- Consumes: `dailyAttendance.id` from `src/db/schema.ts:945`
- Produces: `attendanceCorrectionRequests.attendanceId` referencing `dailyAttendance.id`

- [ ] **Step 1: Update `attendanceCorrectionRequests` in schema**
In `src/db/schema.ts`:
Change line 477 from:
```typescript
  attendanceId: text("attendance_id")
    .notNull()
    .references(() => attendance.id, { onDelete: "cascade" }),
```
to:
```typescript
  attendanceId: text("attendance_id")
    .notNull()
    .references(() => dailyAttendance.id, { onDelete: "cascade" }),
```

- [ ] **Step 2: Verify typecheck passes**
Run: `npx tsc --noEmit`
Expected: 0 errors (or only downstream dispute actions that we will update in Task 5).

- [ ] **Step 3: Commit changes locally**
```bash
git add src/db/schema.ts
git commit -m "refactor(schema): link attendance correction requests to dailyAttendance"
```

---

### Task 2: Decouple Lecture Logging from Attendance Checklists

**Files:**
- Modify: `src/features/sessions/components/session-form.tsx:613-710`
- Modify: `src/features/sessions/actions/session-actions.ts:260-280`
- Modify: `src/app/(cr)/cr/log-session/page.tsx:50-115`
- Modify: `src/app/(teacher)/teacher/lecture-logs/new/page.tsx` (if present)

**Interfaces:**
- Consumes: `classSessions`, `lectureLogs`
- Produces: Streamlined `SessionForm` and `createSessionAction` without `attendanceRecords` payload

- [ ] **Step 1: Remove attendance checklist from `SessionForm`**
In `src/features/sessions/components/session-form.tsx`:
- Remove `rosterAttendance` state, student list props, and the entire `Class Attendance Roster` JSX block (lines ~613–710).
- Remove `attendanceRecords` from the submitted payload.

- [ ] **Step 2: Update `createSessionAction`**
In `src/features/sessions/actions/session-actions.ts`:
- Remove `attendanceRecords` validation and parsing.
- Remove Step 3 in the transaction (`tx.insert(attendance).values(...)`).
- Keep lecture session creation, `lectureLogs` insertion, and optional `homework` creation.

- [ ] **Step 3: Strip student absentee pre-fetching from `LogSessionPage`**
In `src/app/(cr)/cr/log-session/page.tsx`:
- Remove queries fetching all enrolled students and morning absentees.
- Pass only schedule routines and subject data to `SessionForm`.

- [ ] **Step 4: Run typecheck**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit changes locally**
```bash
git add src/features/sessions/components/session-form.tsx src/features/sessions/actions/session-actions.ts src/app/(cr)/cr/log-session/page.tsx
git commit -m "refactor(sessions): decouple lecture logging from student attendance rosters"
```

---

### Task 3: CR Attendance Hardening, Cohort Isolation & Route Fix

**Files:**
- Modify: `src/app/(cr)/cr/take-attendance/page.tsx`
- Modify: `src/app/(cr)/cr/take-attendance/client-page.tsx`
- Modify: `src/features/attendance/actions/daily.ts`
- Create: `src/app/(cr)/cr/attendance/page.tsx` (resolving 404)
- Modify: `src/app/(cr)/cr/page.tsx` (copy updates)

**Interfaces:**
- Consumes: `dailySessions`, `dailyAttendance`, `studentProfiles`
- Produces: Secure `/cr/take-attendance`, `/cr/attendance` route, cohort-locked server actions

- [ ] **Step 1: Fix critical institution-wide roster leak in `TakeDailyAttendancePage`**
In `src/app/(cr)/cr/take-attendance/page.tsx`:
- Delete the dangerous fallback `if (roster.length === 0) { db.select().from(students) }`.
- Enforce CR's own semester: if `user.role === 'CR'`, unconditionally use the CR's semester from `studentProfiles`.

- [ ] **Step 2: Lock server actions to CR's semester**
In `src/features/attendance/actions/daily.ts`:
- In `submitDailyAttendanceAction`, if the authenticated user has role `CR`, verify that the submitted semester strictly matches the CR's `studentProfile.semester`.

- [ ] **Step 3: Implement `/cr/attendance/page.tsx`**
Create `src/app/(cr)/cr/attendance/page.tsx`:
- Render the monthly attendance matrix and daily attendance records for the CR's cohort.
- Include date selector and quick link to `/cr/take-attendance`.

- [ ] **Step 4: Standardize terminology in CR pages**
In `src/app/(cr)/cr/page.tsx` and `client-page.tsx`:
- Replace "Morning Roll Call" / "Submit Roll Call" with "Attendance" / "Take Attendance" / "Save Attendance".

- [ ] **Step 5: Run typecheck**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit changes locally**
```bash
git add src/app/(cr)/cr/take-attendance/page.tsx src/app/(cr)/cr/take-attendance/client-page.tsx src/features/attendance/actions/daily.ts src/app/(cr)/cr/attendance/page.tsx src/app/(cr)/cr/page.tsx
git commit -m "feat(cr): lock cohort isolation, add cr attendance route, and standardize terminology"
```

---

### Task 4: Student Attendance Hub, Dashboard & Missed Classes Journal

**Files:**
- Modify: `src/app/(student)/page.tsx`
- Modify: `src/app/(student)/attendance/page.tsx`
- Modify: `src/features/attendance/components/what-if-calculator.tsx`
- Modify: `src/app/(student)/missed/page.tsx`

**Interfaces:**
- Consumes: `dailyAttendance`, `dailySessions`, `classSessions`, `lectureLogs`
- Produces: 0%-bug-free Student Dashboard, Attendance Barometer, History Ledger, and Missed Classes Catch-up Journal

- [ ] **Step 1: Fix Student Dashboard gauge query**
In `src/app/(student)/page.tsx`:
- Remove `attendanceRecords` query (legacy `attendance`).
- Calculate overall attendance metrics strictly from `dailyRecords` (`dailyAttendance`).
- Update copy from "morning roll call" / "classes" to "days attended".

- [ ] **Step 2: Rebuild `/attendance` with Chronological History Ledger**
In `src/app/(student)/attendance/page.tsx`:
- Remove legacy subject-breakdown loops.
- Query `dailyAttendance` joined with `dailySessions` for `student.id`.
- Render:
  1. Top Attendance Barometer (80% TU criteria, status chip: SAFE/CAUTION/DANGER, missable/recovery days buffer).
  2. What-If Calculator (bound to daily stats).
  3. Chronological Attendance History Ledger: list of all marked days with Bikram Sambat date (`formatNepaliDate`), day of week, status badge (`Present`, `Late`, `Excused`, `Absent`), and inline Dispute trigger for absent/late days.

- [ ] **Step 3: Update `WhatIfCalculator` wording**
In `src/features/attendance/components/what-if-calculator.tsx`:
- Update labels from "Future Classes" to "Future Days".
- Update output from "missable classes" to "missable days".

- [ ] **Step 4: Rebuild `/missed` as Missed Classes Catch-Up Journal**
In `src/app/(student)/missed/page.tsx`:
- Query `dailyAttendance` where `studentId = student.id` and `status IN ('absent', 'late')`.
- For each absent/late date, fetch `classSessions` and `lectureLogs` for that date.
- Display topics covered, teacher notes, and homework assigned so the student can catch up.
- Provide a direct link to request attendance correction.

- [ ] **Step 5: Run typecheck**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit changes locally**
```bash
git add src/app/(student)/page.tsx src/app/(student)/attendance/page.tsx src/features/attendance/components/what-if-calculator.tsx src/app/(student)/missed/page.tsx
git commit -m "feat(student): unify attendance barometer, add chronological history ledger, and update missed journal"
```

---

### Task 5: Teacher Attendance, Roster & Dispute Review Pipeline

**Files:**
- Modify: `src/app/(teacher)/teacher/attendance/page.tsx`
- Modify: `src/app/(teacher)/teacher/attendance/roster/page.tsx`
- Modify: `src/features/attendance/actions/dispute-review.ts`
- Modify: `src/app/(teacher)/teacher/page.tsx`

**Interfaces:**
- Consumes: `dailySessions`, `dailyAttendance`, `attendanceCorrectionRequests`
- Produces: Semester-scoped Teacher Attendance Roster, secure dispute review, and Teacher Dashboard pending items

- [ ] **Step 1: Refactor `TeacherAttendancePage`**
In `src/app/(teacher)/teacher/attendance/page.tsx`:
- Query the teacher's assigned semesters via `subjects.semester`.
- Show assigned semesters with student counts and attendance status for today.
- Display pending attendance disputes belonging to students in those semesters.

- [ ] **Step 2: Refactor `TeacherRosterPage` to be semester-based**
In `src/app/(teacher)/teacher/attendance/roster/page.tsx`:
- Accept `?semester=...` parameter.
- Query `dailySessions` and `dailyAttendance` for that semester.
- Render each student's attendance percentage calculated from daily attendance, with red highlight for students below 80%.

- [ ] **Step 3: Update `reviewDisputeAction`**
In `src/features/attendance/actions/dispute-review.ts`:
- Update query to join `attendanceCorrectionRequests` -> `dailyAttendance` -> `dailySessions`.
- Verify teacher teaches in `dailySessions.semester` (or is ADMIN).
- Revalidate paths: `/teacher/attendance`, `/teacher/attendance/roster`, `/attendance`, `/admin/attendance`.

- [ ] **Step 4: Update Teacher Dashboard with Pending Actions**
In `src/app/(teacher)/teacher/page.tsx`:
- Render the `pendingGrading` counter and pending attendance disputes in a unified "Pending Actions" card.

- [ ] **Step 5: Run typecheck**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit changes locally**
```bash
git add src/app/(teacher)/teacher/attendance/page.tsx src/app/(teacher)/teacher/attendance/roster/page.tsx src/features/attendance/actions/dispute-review.ts src/app/(teacher)/teacher/page.tsx
git commit -m "feat(teacher): update attendance roster to semester daily attendance and wire dispute reviews"
```

---

### Task 6: Dead Code Elimination & Zero-Regression Verification

**Files:**
- Review & Delete: Any unreferenced subject-attendance components in `src/features/attendance/components/`
- Review: `src/lib/navigation/` and copy strings across all roles
- Test: Full TypeScript verification

- [ ] **Step 1: Scan and eliminate dead code**
- Check for unreferenced components or obsolete helper functions that were exclusively used by the old subject-wise attendance tables.
- Remove commented-out code blocks or unused imports.

- [ ] **Step 2: Global wording audit**
- Verify no user-facing strings contain "Morning Roll Call" or "Roll Call"; confirm all use "Attendance".

- [ ] **Step 3: Full TypeScript Check**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit changes locally**
```bash
git add -A
git commit -m "chore: eliminate dead attendance code and verify zero-regression typecheck"
```
