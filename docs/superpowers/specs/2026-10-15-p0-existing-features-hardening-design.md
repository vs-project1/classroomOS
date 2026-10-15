# P0 Existing Features Hardening Design Spec
**Date:** 2026-10-15  
**Status:** Approved  
**Scope:** P0 Architectural, Schema & Transactional Hardening for Attendance, Routine/Class Sessions, and Homework/Google Drive Submissions  

---

## 1. Overview & Objectives

This design specification hardens the existing core workflows of CLASSROOM OS without adding unrequested new features. It targets three critical production vulnerabilities identified during audits against open-source LMS systems (Canvas LMS, Moodle, and Gibbon Edu):

1. **Attendance Engine:** Prevent silent deletion of student dispute tickets (`attendanceCorrectionRequests`) when daily roll call is re-submitted.
2. **Weekly Routine & Timetable Engine:** Close collision blindspots for non-subject slots (`LAB`, `BREAK`, `ECA`), make 14-day schedule generation atomic, and fix multi-section/double-period crashes.
3. **Homework & Google Drive Engine:** Add pre-flight URL validation and Canvas LMS-style inline iframe previewing for Google Drive submissions while keeping the Nepal physical notebook workflow reliable and atomic.
4. **Data Integrity & Joins:** Eliminate fragile legacy joins (`users.email = students.email`) across notifications, replacing them with canonical foreign keys (`students.userId = users.id`).

---

## 2. Database Schema Adjustments (`src/db/schema.ts`)

### 2.1. `weekly_routine` Table
* **Issue:** Slots created with `customTitle` (and `subjectId = null`, such as `BREAK`, `LAB`, or `ECA`) currently lack a `semester` column, causing conflict detection to skip section/semester validation.
* **Schema Modification:**
  ```typescript
  // src/db/schema.ts -> weeklyRoutine
  semester: text("semester").notNull().default("I"),
  ```
* **Indexes:**
  ```typescript
  index("idx_weekly_routine_semester").on(table.semester),
  index("idx_weekly_routine_sem_sec").on(table.semester, table.section),
  ```

### 2.2. `class_sessions` Table
* **Issue:** Table constraint `unique("unq_class_session_subject_date").on(table.subjectId, table.sessionDate)` crashes on duplicate date inserts when Section A and Section B share a subject on the same date, or when a subject has double periods (morning theory + lab).
* **Schema Modification:**
  ```typescript
  // src/db/schema.ts -> classSessions
  section: text("section").notNull().default("A"),
  ```
* **Constraints & Indexes:**
  Replace `unq_class_session_subject_date` with:
  ```typescript
  unique("unq_class_session_slot").on(
    table.subjectId,
    table.sessionDate,
    table.section,
    table.startTime
  ),
  index("idx_class_sessions_sec_date").on(table.section, table.sessionDate),
  ```

### 2.3. Migration & Backfill Sequence
1. Drizzle Kit generates SQLite migration files in `drizzle/`.
2. Backfill script ensures existing rows in `weekly_routine` receive their parent subject's `semester` (or default `"I"` if null).
3. Existing `class_sessions` rows are defaulted to `section = 'A'`.

---

## 3. Data Access Layer & Logic Specifications

### 3.1. Attendance Dispute-Safe Upsert (`src/features/attendance/actions/daily.ts`)
* **Current Vulnerability:** `submitDailyAttendanceAction` runs `await tx.delete(dailyAttendance).where(eq(dailyAttendance.dailySessionId, sessionId))`. Because `attendanceCorrectionRequests.attendanceId` cascades on delete, all student disputes for that session are permanently wiped out when a teacher or CR edits attendance.
* **Hardened Implementation:**
  ```typescript
  // In submitDailyAttendanceAction inside tx:
  // 1. Maintain dailySession record:
  if (existingSession) {
    sessionId = existingSession.id;
    await tx.update(dailySessions).set({
      markedBy: user.id,
    }).where(eq(dailySessions.id, sessionId));
  } else {
    sessionId = `ds_${crypto.randomUUID()}`;
    await tx.insert(dailySessions).values({
      id: sessionId,
      date: normalizedDate,
      semester: targetSemester,
      section: targetSection,
      markedBy: user.id,
    });
  }

  // 2. Atomic Upsert on unq_daily_attendance_session_student:
  for (const record of records) {
    await tx.insert(dailyAttendance).values({
      id: `da_${crypto.randomUUID()}`,
      dailySessionId: sessionId,
      studentId: record.studentId,
      status: record.status,
    }).onConflictDoUpdate({
      target: [dailyAttendance.dailySessionId, dailyAttendance.studentId],
      set: {
        status: sql`excluded.status`,
      },
    });
  }
  ```
* **Result:** `dailyAttendance.id` is preserved. `attendanceCorrectionRequests` remain 100% intact.

### 3.2. Routine Session Generation & Transaction Boundary (`src/features/routine/actions/routine-actions.ts`)
* **Current Vulnerability:** `syncSessionsForRoutine` executes an un-transactioned sequence: first deletes existing sessions in a 14-day window, then loops inserts with individual try/catches. If interrupted or crashed, sessions are half-deleted.
* **Hardened Implementation:**
  ```typescript
  // Wrap entire 14-day session wipe & rebuild in an atomic transaction:
  await db.transaction(async (tx) => {
    const existing = await tx.query.classSessions.findMany({
      where: and(
        eq(classSessions.routineId, routineId),
        gte(classSessions.sessionDate, windowStart),
        lte(classSessions.sessionDate, windowEnd)
      ),
    });

    if (existing.length > 0) {
      await tx.delete(classSessions).where(inArray(classSessions.id, existing.map(s => s.id)));
    }

    if (toInsert.length > 0) {
      await tx.insert(classSessions).values(toInsert).onConflictDoNothing();
    }
  });
  ```

### 3.3. Overlap Engine Integrity (`checkOverlap`)
* **Hardened Implementation:**
  Update `checkOverlap` signature and logic to accept `semester`:
  ```typescript
  async function checkOverlap(
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    semester: string,
    section: string = "A",
    subjectId?: string | null,
    room?: string,
    teacherId?: string | null,
    excludeId?: string
  ) {
    // 1. Fetch routines matching dayOfWeek
    // 2. Check room collision
    // 3. Check teacher collision
    // 4. Check section & semester collision:
    // Compare r.semester === semester && r.section === section across ALL slot types
  }
  ```

### 3.4. Canonical User-Student Notification Joins
* **Target Files:**
  * `src/features/routine/actions/routine-actions.ts` (`notifyEnrolledStudents`)
  * `src/features/assignments/actions/assignments.ts` (`createHomework`)
* **Fix:**
  Replace:
  ```typescript
  .innerJoin(students, eq(students.id, enrollments.studentId))
  .innerJoin(users, eq(users.email, students.email))
  ```
  With:
  ```typescript
  .innerJoin(students, eq(students.id, enrollments.studentId))
  .innerJoin(users, eq(users.id, students.userId))
  ```

---

## 4. Google Drive & Homework Hardening

### 4.1. Drive Utility Module (`src/features/assignments/utils/drive.ts`)
* Provide typed utilities:
  1. `validateGoogleDriveUrl(url: string): { isValid: boolean; error?: string; fileId?: string; type?: "file" | "doc" | "sheet" | "slide" | "folder" }`
  2. `toGoogleDrivePreviewUrl(url: string): string`
     * Converts `https://drive.google.com/file/d/:id/view...` -> `https://drive.google.com/file/d/:id/preview`
     * Converts `https://docs.google.com/document/d/:id/edit...` -> `https://docs.google.com/document/d/:id/preview`
     * Converts `https://docs.google.com/spreadsheets/d/:id/edit...` -> `https://docs.google.com/spreadsheets/d/:id/preview`

### 4.2. Action Validation (`src/features/assignments/actions/assignments.ts`)
* In `submitAssignmentAction`:
  * If `fileUrl` is supplied and belongs to Google Drive, execute `validateGoogleDriveUrl`.
  * Return clear field error if link format is invalid.

### 4.3. UI Preview Enhancement (Canvas LMS SpeedGrader Pattern)
* In grading and submission view components, when a submission has a Google Drive `fileUrl`:
  * Render an embedded `<iframe>` pointing to the normalized `/preview` URL.
  * Provide a fallback "Open in Google Drive" external link in case institutional sign-in or permission cookies require direct navigation.

---

## 5. Verification & Testing Protocol

1. **TypeScript Typecheck:** `npx tsc --noEmit` must return exit code 0.
2. **Attendance Dispute Integrity Test:**
   * Create daily session with attendance.
   * Create an attendance correction request linked to that attendance row.
   * Edit attendance roll call for that session.
   * Verify the correction request still exists and `attendanceId` matches.
3. **Routine Collision Test:**
   * Create a `LAB` slot with `customTitle: "Physics Lab"` for Semester I, Section A at 08:00–09:30.
   * Attempt to create another slot for Semester I, Section A at 08:30–10:00.
   * Verify `checkOverlap` rejects the collision.
4. **Multi-Role Subagent Verification:**
   * Run verification with Teacher, CR, and Student verification subagents.
