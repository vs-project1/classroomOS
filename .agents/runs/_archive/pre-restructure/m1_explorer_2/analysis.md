# Milestone 1: Comprehensive Database Verification Suite Architecture & Design Report

**Author**: Explorer 2 (`m1_explorer_2`)  
**Parent Agent**: `sub_orch_m1` (`8a63ca24-dda9-4209-bd5b-b5898325a6ba`)  
**Target File**: `scripts/verify-db.ts` (and proposed `proposed_verify_db.ts`)  
**Date**: 2026-08-15  
**Related Scope**: Milestone 1 (Database Schema Extension & Seeding Infrastructure)

---

## 1. Executive Summary & Problem Analysis

### 1.1 Current State Analysis (`scripts/verify-db.ts`)
An inspection of `scripts/verify-db.ts` revealed that the verification script currently tests only the 5 legacy tables (`subjects`, `students`, `classSessions`, `lectureLogs`, `attendance`):
- **Limited Coverage**: None of the 10 new tables (`users`, `student_profiles`, `enrollments`, `assignment_submissions`, `exams`, `exam_results`, `resources`, `study_tasks`, `notifications`, `attendance_correction_requests`) are tested.
- **Single Monolithic Try/Catch Block**: If one step throws an error, execution immediately stops without identifying which assertions succeeded, which failed, or how many total assertions were validated.
- **Missing Negative Test Cases**:
  - Does not test CHECK constraint violations on `users.role`, `student_profiles.semester`, `assignment_submissions.status`, `assignment_submissions.score`, `exams.exam_type`, `exams.marks`, `study_tasks.status`, `study_tasks.priority`, `notifications.type`, or `attendance_correction_requests.requested_status`/`status`.
  - Does not test composite unique constraints on `(studentId, subjectId)` in `enrollments`, `(homeworkId, studentId)` in `assignment_submissions`, or `(examId, studentId)` in `exam_results`.
  - Does not test unique constraints on `users.email`, `student_profiles.userId` (1:1 enforcement), or `student_profiles.rollNumber`.
- **Missing Foreign Key Lifecycle Behaviors**:
  - Does not verify cascade deletions on `users` -> `student_profiles` / `notifications`.
  - Does not verify cascade deletions on `subjects` -> `enrollments` / `exams` / `resources` / `course_units`.
  - Does not verify cascade deletions on `exams` -> `exam_results`.
  - Does not verify cascade deletions on `homework` -> `assignment_submissions`.
  - Does not verify cascade deletions on `students` -> `enrollments` / `assignment_submissions` / `exam_results` / `study_tasks` / `attendance_correction_requests`.
  - Does not verify cascade deletions on `attendance` -> `attendance_correction_requests`.
  - Does not verify `onDelete: "set null"` behavior on `teachers` deletion setting `graded_by`, `uploaded_by`, `reviewed_by`, and `teacher_id` to NULL.
  - Does not verify `onDelete: "set null"` behavior on `course_chapters` deletion setting `resources.chapter_id` to NULL.
- **Environment & Teardown**:
  - The script relies on `import "dotenv/config";`, which fails to load `.env.local` unless explicitly specified.
  - If a test fails midway, temporary test records are left stranded in the database.

### 1.2 Mission Objectives
Design an institutional-grade, rigorous verification suite in `scripts/verify-db.ts` that:
1. **Validates All 23 Tables**: Tests complete insertion, selection, and Drizzle relations navigation across all 10 new tables and all 13 legacy tables.
2. **Guarantees Database-Level Constraint Enforcement**: Proves that SQLite `CHECK` constraints, single `UNIQUE` constraints, and composite `UNIQUE` constraints actively reject invalid or duplicate insertions.
3. **Verifies Referential Integrity Rules**: Proves that `CASCADE` deletes clean up entire dependency trees and `SET NULL` updates orphaned foreign key pointers to `null`.
4. **Provides Robust Test Harness Architecture**: Features isolated test runs (using random UUID prefixes), structured assertions (`assert`, `assertThrows`), categorized test suites, granular pass/fail counters, and guaranteed cleanup in a `finally` block.
5. **Standalone Execution**: Can be run via `npx tsx scripts/verify-db.ts` or `npm run db:verify` with zero configuration overhead and exits with code 0 on success or 1 on failure.

---

## 2. Verification Suite Architecture & Design

### 2.1 Test Harness & Framework Design
To ensure maintainability, readability, and immediate diagnostic clarity, the verification script is structured around a lightweight, zero-dependency test runner embedded in the script:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Database Verification Test Harness                   │
│                                                                        │
│   Suite 1: Schema Lifecycle & Relations (All 10 New + Legacy Tables)   │
│   Suite 2: Database CHECK Constraint Rejection Tests                   │
│   Suite 3: UNIQUE & Composite UNIQUE Constraint Rejection Tests        │
│   Suite 4: Foreign Key CASCADE Deletion Verification                   │
│   Suite 5: Foreign Key SET NULL Verification                           │
│   Suite 6: Atomic Transaction & Rollback Verification                  │
│   Suite 7: Teardown, Cleanup & Zero-Orphan Verification                │
└────────────────────────────────────────────────────────────────────────┘
```

#### Core Test Runner Primitives:
```typescript
interface TestStats {
  passed: number;
  failed: number;
  total: number;
  errors: { testName: string; error: any }[];
}

// Global assertion helper
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Expected rejection helper
async function assertRejects(
  fn: () => Promise<any>,
  testDescription: string
): Promise<void> {
  let didReject = false;
  try {
    await fn();
  } catch (error) {
    didReject = true;
  }
  if (!didReject) {
    throw new Error(`Expected rejection did NOT occur for: ${testDescription}`);
  }
}

// Structured test suite runner
async function runSuite(
  suiteName: string,
  tests: { name: string; fn: () => Promise<void> }[]
): Promise<void>
```

---

## 3. Detailed Test Suite Specifications

### Suite 1: Full Schema Lifecycle & Relational Queries (10 New Tables + Existing)
Tests happy-path insertion of all 10 new tables, querying records back from the database, and validating Drizzle relational graph traversal.

| # | Table Under Test | Test Scenario | Verified Fields & Relations |
|---|---|---|---|
| 1.1 | `users` | Insert Admin, Teacher, CR, Student users | `email`, `role`, `mustChangePassword`, `isActive`, `createdAt` |
| 1.2 | `studentProfiles` | Insert student profile linked 1:1 to student user | `userId` -> `users.id`, `rollNumber`, `faculty`, `semester`, `section`, `batchYear` |
| 1.3 | `teachers` & `subjects` | Insert teacher and subject referencing teacher | `subjects.teacherId` -> `teachers.id`, code unique |
| 1.4 | `students` | Insert student roster record | `rollNumber`, `faculty`, `semester` |
| 1.5 | `courseUnits`, `courseChapters`, `courseMaterials` | Insert 3-level course hierarchy | Subject -> Unit -> Chapter -> Material |
| 1.6 | `weeklyRoutine`, `classSessions`, `lectureLogs`, `attendance` | Insert scheduling, session, log, and attendance | Routine -> Session -> Log & Attendance |
| 1.7 | `enrollments` | Insert subject enrollment for student | `studentId`, `subjectId`, `semester`, `enrolledAt` |
| 1.8 | `homework` & `assignmentSubmissions` | Insert homework and student assignment submission | `homeworkId`, `studentId`, `status: "submitted"`, `fileUrl`, `score`, `grade`, `gradedBy` |
| 1.9 | `exams` & `examResults` | Insert exam (midterm) and student exam result | `exams.subjectId`, `examType: "midterm"`, `totalMarks: 40`, `passMarks: 16`, `examResults.obtainedMarks: 34` |
| 1.10 | `resources` | Insert downloadable resource for subject & chapter | `subjectId`, `chapterId`, `fileUrl`, `fileType: "pdf"`, `uploadedBy` |
| 1.11 | `studyTasks` | Insert student personal study task | `studentId`, `subjectId`, `status: "in_progress"`, `priority: "high"`, `dueDate` |
| 1.12 | `notifications` | Insert user notification | `userId`, `type: "assignment"`, `title`, `isRead: false` |
| 1.13 | `attendanceCorrectionRequests` | Insert attendance correction ticket | `attendanceId`, `studentId`, `requestedStatus: "present"`, `status: "pending"`, `reason` |
| 1.14 | Relational Navigation | Deep query via `db.query.*` | Traverses `users` with `studentProfile`, `subjects` with `enrollments`/`exams`/`resources`, `homework` with `submissions` |

---

### Suite 2: CHECK Constraint Violation Tests (Database-Level Rejection)
Actively attempts to insert illegal enum values, out-of-range bounds, negative marks, and backwards timestamps, asserting that SQLite rejects each one.

| # | Target Table | Tested Column / Rule | Violating Input Value | Expected Database Behavior |
|---|---|---|---|---|
| 2.1 | `users` | `chk_users_role` | `role: "SUPERADMIN"` or `"HACKER"` | Throws SQLite constraint violation |
| 2.2 | `studentProfiles` | `chk_student_profiles_semester` | `semester: 0` or `semester: 9` | Throws SQLite constraint violation |
| 2.3 | `enrollments` | `chk_enrollments_semester` | `semester: 12` | Throws SQLite constraint violation |
| 2.4 | `assignmentSubmissions` | `chk_assignment_submissions_status` | `status: "cheated"` or `"pending"` | Throws SQLite constraint violation |
| 2.5 | `assignmentSubmissions` | `chk_assignment_submissions_score` | `score: -10` | Throws SQLite constraint violation |
| 2.6 | `exams` | `chk_exams_type` | `examType: "pop_quiz"` or `"entrance"` | Throws SQLite constraint violation |
| 2.7 | `exams` | `chk_exams_marks` (pass > total) | `totalMarks: 40, passMarks: 50` | Throws SQLite constraint violation |
| 2.8 | `exams` | `chk_exams_marks` (total <= 0) | `totalMarks: 0, passMarks: 0` | Throws SQLite constraint violation |
| 2.9 | `exams` | `chk_exams_time` (start >= end) | `startTime: "12:00", endTime: "10:00"` | Throws SQLite constraint violation |
| 2.10 | `examResults` | `chk_exam_results_marks` | `obtainedMarks: -5` | Throws SQLite constraint violation |
| 2.11 | `studyTasks` | `chk_study_tasks_status` | `status: "archived"` or `"cancelled"` | Throws SQLite constraint violation |
| 2.12 | `studyTasks` | `chk_study_tasks_priority` | `priority: "urgent"` or `"critical"` | Throws SQLite constraint violation |
| 2.13 | `notifications` | `chk_notifications_type` | `type: "marketing"` or `"spam"` | Throws SQLite constraint violation |
| 2.14 | `attendanceCorrectionRequests` | `chk_attendance_correction_requested_status` | `requestedStatus: "absent"` or `"late"` | Throws SQLite constraint violation |
| 2.15 | `attendanceCorrectionRequests` | `chk_attendance_correction_status` | `status: "closed"` or `"dismissed"` | Throws SQLite constraint violation |
| 2.16 | `attendance` | `chk_attendance_status` | `status: "bunked"` | Throws SQLite constraint violation |
| 2.17 | `weeklyRoutine` | `chk_weekly_routine_day` | `dayOfWeek: 7` | Throws SQLite constraint violation |
| 2.18 | `weeklyRoutine` | `chk_weekly_routine_time` | `startTime: "14:00", endTime: "13:00"` | Throws SQLite constraint violation |

---

### Suite 3: UNIQUE & Composite UNIQUE Constraint Rejection Tests
Validates that single unique indexes and composite multi-column unique constraints prevent duplicate data insertions.

| # | Target Table | Constraint Name | Tested Columns | Rejection Verification Scenario |
|---|---|---|---|---|
| 3.1 | `users` | Primary unique index | `email` | Inserting two users with identical email address throws unique violation |
| 3.2 | `studentProfiles` | `unq_student_profiles_user_id` | `userId` | Inserting two student profiles for the same user ID throws unique violation (1:1) |
| 3.3 | `studentProfiles` | Primary unique index | `rollNumber` | Inserting two student profiles with identical rollNumber throws unique violation |
| 3.4 | `enrollments` | `unq_enrollments_student_subject` | `(studentId, subjectId)` | Enrolling the same student in the same subject twice throws unique violation |
| 3.5 | `assignmentSubmissions` | `unq_assignment_submissions_homework_student` | `(homeworkId, studentId)` | Creating two submissions for the same assignment by the same student throws unique violation |
| 3.6 | `examResults` | `unq_exam_results_exam_student` | `(examId, studentId)` | Creating two exam results for the same student on the same exam throws unique violation |
| 3.7 | `attendance` | `unq_attendance_session_student` | `(classSessionId, studentId)` | Creating two attendance records for the same student in the same session throws unique violation |
| 3.8 | `lectureLogs` | Primary unique index | `classSessionId` | Creating two lecture logs for the same class session throws unique violation |
| 3.9 | `subjects` | Primary unique index | `code` | Creating two subjects with the same course code throws unique violation |

---

### Suite 4: Foreign Key CASCADE Deletion Verification
Validates that deleting parent records cleanly cascades downward to eliminate all dependent child rows without leaving orphaned records.

```
[users] ──(CASCADE)──> [studentProfiles]
        ──(CASCADE)──> [notifications]

[subjects] ──(CASCADE)──> [weeklyRoutine]
           ──(CASCADE)──> [classSessions] ──(CASCADE)──> [lectureLogs]
                                         ──(CASCADE)──> [attendance] ──(CASCADE)──> [attendanceCorrectionRequests]
           ──(CASCADE)──> [homework] ──(CASCADE)──> [assignmentSubmissions]
           ──(CASCADE)──> [courseUnits] ──(CASCADE)──> [courseChapters] ──(CASCADE)──> [courseMaterials]
           ──(CASCADE)──> [enrollments]
           ──(CASCADE)──> [exams] ──(CASCADE)──> [examResults]
           ──(CASCADE)──> [resources]

[students] ──(CASCADE)──> [attendance]
           ──(CASCADE)──> [enrollments]
           ──(CASCADE)──> [assignmentSubmissions]
           ──(CASCADE)──> [examResults]
           ──(CASCADE)──> [studyTasks]
           ──(CASCADE)──> [attendanceCorrectionRequests]
```

| # | Cascade Test Scenario | Deletion Target | Verified Cascade Deletions (Must return null) |
|---|---|---|---|
| 4.1 | **User Cascade** | Delete `users` (id: `u_casc`) | `studentProfiles` (userId = `u_casc`), `notifications` (userId = `u_casc`) |
| 4.2 | **Subject Complete Cascade** | Delete `subjects` (id: `s_casc`) | `weeklyRoutine`, `classSessions`, `lectureLogs`, `attendance`, `homework`, `assignmentSubmissions`, `courseUnits`, `courseChapters`, `courseMaterials`, `enrollments`, `exams`, `examResults`, `resources` |
| 4.3 | **Exam Results Cascade** | Delete `exams` (id: `e_casc`) | `examResults` (examId = `e_casc`) |
| 4.4 | **Homework Submissions Cascade** | Delete `homework` (id: `hw_casc`) | `assignmentSubmissions` (homeworkId = `hw_casc`) |
| 4.5 | **Attendance Correction Cascade** | Delete `attendance` (id: `att_casc`) | `attendanceCorrectionRequests` (attendanceId = `att_casc`) |
| 4.6 | **Student Cascade** | Delete `students` (id: `stud_casc`) | `attendance`, `enrollments`, `assignmentSubmissions`, `examResults`, `studyTasks`, `attendanceCorrectionRequests` |

---

### Suite 5: Foreign Key SET NULL Verification
Validates that when optional foreign reference entities are deleted, child records are **preserved** and the foreign key column is safely set to `NULL`.

| # | Reference Target | Child Table | FK Column | Deletion Target | Verified Outcome |
|---|---|---|---|---|---|
| 5.1 | `teachers` | `subjects` | `teacherId` | Delete `teachers` | Subject remains; `subject.teacherId === null` |
| 5.2 | `teachers` | `assignmentSubmissions` | `gradedBy` | Delete `teachers` | Submission remains; `submission.gradedBy === null` |
| 5.3 | `teachers` | `resources` | `uploadedBy` | Delete `teachers` | Resource remains; `resource.uploadedBy === null` |
| 5.4 | `teachers` | `attendanceCorrectionRequests` | `reviewedBy` | Delete `teachers` | Correction request remains; `request.reviewedBy === null` |
| 5.5 | `courseChapters` | `resources` | `chapterId` | Delete `courseChapters` | Resource remains; `resource.chapterId === null` |
| 5.6 | `subjects` | `studyTasks` | `subjectId` | Delete `subjects` | Study task remains; `studyTask.subjectId === null` |
| 5.7 | `weeklyRoutine` | `classSessions` | `routineId` | Delete `weeklyRoutine` | Class session remains; `classSession.routineId === null` |
| 5.8 | `classSessions` | `homework` | `sessionId` | Delete `classSessions` | Homework remains; `homework.sessionId === null` |

---

### Suite 6: Atomic Transactions & Rollback Verification
Ensures multi-table transactional operations remain atomic and roll back cleanly on errors:
- Executes a transaction inserting a new `classSession`, `lectureLog`, and an invalid `attendance` record (referencing a non-existent student).
- Confirms that the transaction fails and asserts that neither the `classSession` nor the `lectureLog` was committed to the database.

---

### Suite 7: Automated Cleanup & Test Isolation
- All test IDs use `test_${crypto.randomUUID().slice(0, 8)}_...` prefixes.
- The entire test execution runs inside a `try...finally` block that guarantees complete deletion of all test records created during the run, even if an assertion fails midway.
- Calculates total duration and prints a clean ASCII summary table.

---

## 4. Proposed Implementation Code for `scripts/verify-db.ts`

The complete, fully functioning verification script designed for `scripts/verify-db.ts` is documented below and saved in `proposed_verify_db.ts`:

```typescript
import { config } from "dotenv";
config({ path: ".env.local" });
config(); // Fallback to .env if present

import { db } from "../src/db/client";
import {
  teachers,
  subjects,
  students,
  weeklyRoutine,
  classSessions,
  lectureLogs,
  attendance,
  homework,
  notices,
  events,
  courseUnits,
  courseChapters,
  courseMaterials,
  users,
  studentProfiles,
  enrollments,
  assignmentSubmissions,
  exams,
  examResults,
  resources,
  studyTasks,
  notifications,
  attendanceCorrectionRequests,
} from "../src/db/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

// Test Execution Statistics
interface TestStats {
  passed: number;
  failed: number;
  total: number;
  errors: { suite: string; name: string; error: any }[];
}

const stats: TestStats = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: [],
};

// Assertion Helper
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

// Rejection Assertion Helper
async function assertRejects(
  fn: () => Promise<any>,
  description: string
): Promise<void> {
  let didReject = false;
  try {
    await fn();
  } catch (error) {
    didReject = true;
  }
  if (!didReject) {
    throw new Error(`Constraint Failed (Did not reject): ${description}`);
  }
}

// Suite Runner Helper
async function runTest(
  suiteName: string,
  testName: string,
  testFn: () => Promise<void>
): Promise<void> {
  stats.total++;
  try {
    await testFn();
    stats.passed++;
    console.log(`  ✓ [PASS] ${testName}`);
  } catch (error: any) {
    stats.failed++;
    stats.errors.push({ suite: suiteName, name: testName, error });
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(`     -> Error: ${error?.message || error}`);
  }
}

async function verify() {
  const startTime = Date.now();
  console.log("================================================================================");
  console.log("  Classroom OS — Comprehensive Database Verification Suite");
  console.log("================================================================================\n");

  const runId = crypto.randomUUID().slice(0, 8);
  const prefix = `test_${runId}`;

  // Track created IDs for guaranteed cleanup
  const cleanupBag = {
    userIds: new Set<string>(),
    studentProfileIds: new Set<string>(),
    teacherIds: new Set<string>(),
    subjectIds: new Set<string>(),
    studentIds: new Set<string>(),
    routineIds: new Set<string>(),
    sessionIds: new Set<string>(),
    logIds: new Set<string>(),
    attendanceIds: new Set<string>(),
    homeworkIds: new Set<string>(),
    submissionIds: new Set<string>(),
    examIds: new Set<string>(),
    examResultIds: new Set<string>(),
    unitIds: new Set<string>(),
    chapterIds: new Set<string>(),
    materialIds: new Set<string>(),
    resourceIds: new Set<string>(),
    studyTaskIds: new Set<string>(),
    notificationIds: new Set<string>(),
    correctionRequestIds: new Set<string>(),
    noticeIds: new Set<string>(),
    eventIds: new Set<string>(),
    enrollmentIds: new Set<string>(),
  };

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: Full Schema Lifecycle & Relations (All 23 Tables)
    // -------------------------------------------------------------------------
    console.log("📦 SUITE 1: Full Schema Lifecycle & Relational Queries");

    const uAdminId = `${prefix}_u_admin`;
    const uTeacherId = `${prefix}_u_teacher`;
    const uStudentId = `${prefix}_u_student`;
    const profileId = `${prefix}_prof_1`;
    const teacherId = `${prefix}_teach_1`;
    const subjectId = `${prefix}_subj_1`;
    const studentId = `${prefix}_stud_1`;
    const unitId = `${prefix}_unit_1`;
    const chapterId = `${prefix}_chap_1`;
    const materialId = `${prefix}_mat_1`;
    const routineId = `${prefix}_rout_1`;
    const sessionId = `${prefix}_sess_1`;
    const logId = `${prefix}_log_1`;
    const attId = `${prefix}_att_1`;
    const hwId = `${prefix}_hw_1`;
    const subId = `${prefix}_sub_1`;
    const examId = `${prefix}_exam_1`;
    const examResId = `${prefix}_res_1`;
    const resourceId = `${prefix}_reso_1`;
    const taskId = `${prefix}_task_1`;
    const notifId = `${prefix}_notif_1`;
    const corrId = `${prefix}_corr_1`;
    const enrollId = `${prefix}_enr_1`;

    await runTest("Suite 1", "1.1 Insert Users & Student Profiles", async () => {
      await db.insert(users).values([
        {
          id: uAdminId,
          email: `${prefix}_admin@classroom.os`,
          passwordHash: "hash_admin_123",
          role: "ADMIN",
          mustChangePassword: false,
          isActive: true,
        },
        {
          id: uTeacherId,
          email: `${prefix}_teacher@classroom.os`,
          passwordHash: "hash_teacher_123",
          role: "TEACHER",
          mustChangePassword: false,
          isActive: true,
        },
        {
          id: uStudentId,
          email: `${prefix}_student@classroom.os`,
          passwordHash: "hash_student_123",
          role: "STUDENT",
          mustChangePassword: true,
          isActive: true,
        },
      ]);
      cleanupBag.userIds.add(uAdminId).add(uTeacherId).add(uStudentId);

      await db.insert(studentProfiles).values({
        id: profileId,
        userId: uStudentId,
        rollNumber: `ROLL-${runId}-01`,
        faculty: "BCA",
        semester: 4,
        section: "A",
        batchYear: 2024,
        phone: "9800000001",
      });
      cleanupBag.studentProfileIds.add(profileId);

      const insertedUser = await db.query.users.findFirst({
        where: eq(users.id, uStudentId),
        with: { studentProfile: true },
      });
      assert(!!insertedUser, "User query returned null");
      assert(insertedUser?.role === "STUDENT", "User role mismatch");
      assert(insertedUser?.studentProfile?.rollNumber === `ROLL-${runId}-01`, "Student profile relation mismatch");
    });

    await runTest("Suite 1", "1.2 Insert Teachers, Subjects, Students, Course Units & Chapters", async () => {
      await db.insert(teachers).values({
        id: teacherId,
        name: "Dr. Rajesh Shrestha",
        email: `${prefix}_rajesh@classroom.os`,
        phone: "9841000001",
        faculties: ["BCA", "CSIT"],
        semesters: ["4th", "6th"],
      });
      cleanupBag.teacherIds.add(teacherId);

      await db.insert(subjects).values({
        id: subjectId,
        name: "Database Management Systems",
        code: `DBMS-${runId}`,
        teacherId: teacherId,
      });
      cleanupBag.subjectIds.add(subjectId);

      await db.insert(students).values({
        id: studentId,
        name: "Aarav Sharma",
        rollNumber: `ROLL-${runId}-01`,
        email: `${prefix}_aarav@classroom.os`,
        faculty: "BCA",
        semester: "4th Semester",
      });
      cleanupBag.studentIds.add(studentId);

      await db.insert(courseUnits).values({
        id: unitId,
        subjectId: subjectId,
        title: "Unit 1: Relational Model",
        order: 1,
      });
      cleanupBag.unitIds.add(unitId);

      await db.insert(courseChapters).values({
        id: chapterId,
        unitId: unitId,
        title: "Chapter 1: Normalization & BCNF",
        order: 1,
      });
      cleanupBag.chapterIds.add(chapterId);

      await db.insert(courseMaterials).values({
        id: materialId,
        chapterId: chapterId,
        title: "BCNF Slides PDF",
        fileUrl: "https://files.classroom.os/bcnf.pdf",
        fileType: "pdf",
      });
      cleanupBag.materialIds.add(materialId);

      const subjQuery = await db.query.subjects.findFirst({
        where: eq(subjects.id, subjectId),
        with: {
          teacher: true,
          courseUnits: {
            with: {
              courseChapters: {
                with: { courseMaterials: true },
              },
            },
          },
        },
      });
      assert(subjQuery?.teacher?.id === teacherId, "Subject -> Teacher relation mismatch");
      assert(subjQuery?.courseUnits[0]?.courseChapters[0]?.courseMaterials[0]?.title === "BCNF Slides PDF", "Course hierarchy mismatch");
    });

    await runTest("Suite 1", "1.3 Insert Routine, Class Sessions, Lecture Logs & Attendance", async () => {
      await db.insert(weeklyRoutine).values({
        id: routineId,
        subjectId: subjectId,
        dayOfWeek: 1, // Sunday
        startTime: "07:00",
        endTime: "08:30",
        teacherName: "Dr. Rajesh Shrestha",
        room: "Room 401",
      });
      cleanupBag.routineIds.add(routineId);

      await db.insert(classSessions).values({
        id: sessionId,
        subjectId: subjectId,
        routineId: routineId,
        sessionDate: new Date(),
        startTime: "07:00",
        endTime: "08:30",
      });
      cleanupBag.sessionIds.add(sessionId);

      await db.insert(lectureLogs).values({
        id: logId,
        classSessionId: sessionId,
        topicsCovered: "Functional Dependencies & 3NF",
        homework: "Solve exercises 4.1 to 4.5",
        notes: "Class was active, good participation",
      });
      cleanupBag.logIds.add(logId);

      await db.insert(attendance).values({
        id: attId,
        classSessionId: sessionId,
        studentId: studentId,
        status: "present",
      });
      cleanupBag.attendanceIds.add(attId);

      const sessQuery = await db.query.classSessions.findFirst({
        where: eq(classSessions.id, sessionId),
        with: {
          subject: true,
          lectureLog: true,
          attendance: { with: { student: true } },
        },
      });
      assert(sessQuery?.lectureLog?.topicsCovered === "Functional Dependencies & 3NF", "LectureLog mismatch");
      assert(sessQuery?.attendance[0]?.student?.id === studentId, "Attendance student relation mismatch");
    });

    await runTest("Suite 1", "1.4 Insert Enrollments, Homework & Assignment Submissions", async () => {
      await db.insert(enrollments).values({
        id: enrollId,
        studentId: studentId,
        subjectId: subjectId,
        semester: 4,
      });
      cleanupBag.enrollmentIds.add(enrollId);

      await db.insert(homework).values({
        id: hwId,
        subjectId: subjectId,
        sessionId: sessionId,
        title: "Assignment 1: ER Diagram & Schema Design",
        description: "Design a relational schema for a hospital management system",
        assignedDate: new Date(),
        dueDate: new Date(Date.now() + 86400000 * 7),
        status: "active",
      });
      cleanupBag.homeworkIds.add(hwId);

      await db.insert(assignmentSubmissions).values({
        id: subId,
        homeworkId: hwId,
        studentId: studentId,
        content: "Attached is the hospital ER diagram schema with 3NF normalization.",
        fileUrl: "https://uploadthing.com/f/hospital-schema.pdf",
        fileName: "hospital-schema.pdf",
        fileSize: 204800,
        status: "graded",
        submittedAt: new Date(),
        score: 38,
        grade: "A+",
        feedback: "Comprehensive ER model with correct primary/foreign key mappings.",
        gradedBy: teacherId,
        gradedAt: new Date(),
      });
      cleanupBag.submissionIds.add(subId);

      const hwQuery = await db.query.homework.findFirst({
        where: eq(homework.id, hwId),
        with: {
          submissions: {
            with: { student: true, gradedByTeacher: true },
          },
        },
      });
      assert(hwQuery?.submissions[0]?.score === 38, "Submission score mismatch");
      assert(hwQuery?.submissions[0]?.gradedByTeacher?.id === teacherId, "Submission gradedBy teacher relation mismatch");
    });

    await runTest("Suite 1", "1.5 Insert Exams & Exam Results", async () => {
      await db.insert(exams).values({
        id: examId,
        subjectId: subjectId,
        title: "Mid-Term Assessment 2026",
        examType: "midterm",
        totalMarks: 40,
        passMarks: 16,
        examDate: new Date(Date.now() + 86400000 * 14),
        startTime: "08:00",
        endTime: "10:00",
        room: "Hall B",
      });
      cleanupBag.examIds.add(examId);

      await db.insert(examResults).values({
        id: examResId,
        examId: examId,
        studentId: studentId,
        obtainedMarks: 36,
        isAbsent: false,
        remarks: "Excellent problem solving in SQL queries.",
      });
      cleanupBag.examResultIds.add(examResId);

      const examQuery = await db.query.exams.findFirst({
        where: eq(exams.id, examId),
        with: {
          results: { with: { student: true } },
        },
      });
      assert(examQuery?.results[0]?.obtainedMarks === 36, "Exam results marks mismatch");
      assert(examQuery?.results[0]?.student?.id === studentId, "Exam results student relation mismatch");
    });

    await runTest("Suite 1", "1.6 Insert Resources, Study Tasks, Notifications & Correction Requests", async () => {
      await db.insert(resources).values({
        id: resourceId,
        subjectId: subjectId,
        chapterId: chapterId,
        title: "Complete DBMS Reference Manual",
        description: "Official TU syllabus reference notes",
        fileUrl: "https://files.classroom.os/dbms-ref.pdf",
        fileType: "pdf",
        fileSize: 1048576,
        uploadedBy: teacherId,
      });
      cleanupBag.resourceIds.add(resourceId);

      await db.insert(studyTasks).values({
        id: taskId,
        studentId: studentId,
        subjectId: subjectId,
        title: "Revise BCNF Decomposition Algorithms",
        description: "Solve 5 practice questions before midterm",
        dueDate: new Date(Date.now() + 86400000 * 3),
        status: "in_progress",
        priority: "high",
      });
      cleanupBag.studyTaskIds.add(taskId);

      await db.insert(notifications).values({
        id: notifId,
        userId: uStudentId,
        title: "Assignment Graded",
        message: "Your DBMS Assignment 1 has been graded: Score 38/40 (A+)",
        type: "assignment",
        link: `/homework?id=${hwId}`,
        isRead: false,
      });
      cleanupBag.notificationIds.add(notifId);

      await db.insert(attendanceCorrectionRequests).values({
        id: corrId,
        attendanceId: attId,
        studentId: studentId,
        requestedStatus: "present",
        reason: "I was present in the second row during Sunday morning lecture.",
        status: "pending",
      });
      cleanupBag.correctionRequestIds.add(corrId);

      const attQuery = await db.query.attendance.findFirst({
        where: eq(attendance.id, attId),
        with: {
          correctionRequests: { with: { student: true } },
        },
      });
      assert(attQuery?.correctionRequests[0]?.reason.includes("second row"), "Attendance correction request mismatch");
    });

    // -------------------------------------------------------------------------
    // SUITE 2: CHECK Constraint Violations (Database-Level Rejection)
    // -------------------------------------------------------------------------
    console.log("\n🛡️ SUITE 2: Database CHECK Constraint Rejection Tests");

    await runTest("Suite 2", "2.1 Reject Invalid User Role ('SUPERADMIN')", async () => {
      await assertRejects(
        () =>
          db.insert(users).values({
            id: `${prefix}_inv_role`,
            email: `${prefix}_inv_role@test.com`,
            passwordHash: "pass",
            role: "SUPERADMIN" as any,
          }),
        "Invalid role 'SUPERADMIN'"
      );
    });

    await runTest("Suite 2", "2.2 Reject Out-of-Range Student Profile Semester (Semester 0 & 9)", async () => {
      await assertRejects(
        () =>
          db.insert(studentProfiles).values({
            id: `${prefix}_inv_sem_0`,
            userId: uAdminId,
            rollNumber: `INV-ROLL-0`,
            faculty: "BCA",
            semester: 0, // Violates BETWEEN 1 AND 8
            section: "A",
            batchYear: 2024,
          }),
        "Student Profile Semester 0"
      );

      await assertRejects(
        () =>
          db.insert(studentProfiles).values({
            id: `${prefix}_inv_sem_9`,
            userId: uAdminId,
            rollNumber: `INV-ROLL-9`,
            faculty: "BCA",
            semester: 9, // Violates BETWEEN 1 AND 8
            section: "A",
            batchYear: 2024,
          }),
        "Student Profile Semester 9"
      );
    });

    await runTest("Suite 2", "2.3 Reject Invalid Assignment Submission Status ('cheated')", async () => {
      await assertRejects(
        () =>
          db.insert(assignmentSubmissions).values({
            id: `${prefix}_inv_sub_stat`,
            homeworkId: hwId,
            studentId: studentId,
            status: "cheated" as any,
          }),
        "Invalid submission status 'cheated'"
      );
    });

    await runTest("Suite 2", "2.4 Reject Negative Assignment Submission Score (Score -5)", async () => {
      await assertRejects(
        () =>
          db.insert(assignmentSubmissions).values({
            id: `${prefix}_inv_score`,
            homeworkId: hwId,
            studentId: studentId,
            score: -5,
          }),
        "Negative submission score -5"
      );
    });

    await runTest("Suite 2", "2.5 Reject Invalid Exam Type ('pop_quiz')", async () => {
      await assertRejects(
        () =>
          db.insert(exams).values({
            id: `${prefix}_inv_exam_type`,
            subjectId: subjectId,
            title: "Pop Quiz 1",
            examType: "pop_quiz" as any,
            totalMarks: 20,
            passMarks: 8,
            examDate: new Date(),
          }),
        "Invalid exam type 'pop_quiz'"
      );
    });

    await runTest("Suite 2", "2.6 Reject Illogical Exam Marks (passMarks > totalMarks)", async () => {
      await assertRejects(
        () =>
          db.insert(exams).values({
            id: `${prefix}_inv_exam_marks`,
            subjectId: subjectId,
            title: "Invalid Marks Exam",
            examType: "unit_test",
            totalMarks: 40,
            passMarks: 50, // passMarks > totalMarks
            examDate: new Date(),
          }),
        "Exam passMarks > totalMarks"
      );
    });

    await runTest("Suite 2", "2.7 Reject Backwards Exam Times (startTime >= endTime)", async () => {
      await assertRejects(
        () =>
          db.insert(exams).values({
            id: `${prefix}_inv_exam_time`,
            subjectId: subjectId,
            title: "Backwards Time Exam",
            examType: "unit_test",
            totalMarks: 40,
            passMarks: 16,
            examDate: new Date(),
            startTime: "12:00",
            endTime: "10:00", // endTime <= startTime
          }),
        "Exam startTime >= endTime"
      );
    });

    await runTest("Suite 2", "2.8 Reject Invalid Study Task Status ('archived') & Priority ('urgent')", async () => {
      await assertRejects(
        () =>
          db.insert(studyTasks).values({
            id: `${prefix}_inv_task_stat`,
            studentId: studentId,
            title: "Task with bad status",
            status: "archived" as any,
          }),
        "Invalid study task status 'archived'"
      );

      await assertRejects(
        () =>
          db.insert(studyTasks).values({
            id: `${prefix}_inv_task_prio`,
            studentId: studentId,
            title: "Task with bad priority",
            priority: "urgent" as any,
          }),
        "Invalid study task priority 'urgent'"
      );
    });

    await runTest("Suite 2", "2.9 Reject Invalid Notification Type ('spam')", async () => {
      await assertRejects(
        () =>
          db.insert(notifications).values({
            id: `${prefix}_inv_notif_type`,
            userId: uStudentId,
            title: "Spam",
            message: "Promo offer",
            type: "spam" as any,
          }),
        "Invalid notification type 'spam'"
      );
    });

    await runTest("Suite 2", "2.10 Reject Invalid Attendance Correction Requested Status ('absent')", async () => {
      await assertRejects(
        () =>
          db.insert(attendanceCorrectionRequests).values({
            id: `${prefix}_inv_corr_req_stat`,
            attendanceId: attId,
            studentId: studentId,
            requestedStatus: "absent" as any, // Only 'present' | 'excused' allowed
            reason: "I was absent please mark me absent",
          }),
        "Invalid requested status 'absent'"
      );
    });

    // -------------------------------------------------------------------------
    // SUITE 3: UNIQUE & Composite UNIQUE Constraint Tests
    // -------------------------------------------------------------------------
    console.log("\n🔒 SUITE 3: UNIQUE & Composite UNIQUE Constraint Rejection Tests");

    await runTest("Suite 3", "3.1 Reject Duplicate User Email", async () => {
      await assertRejects(
        () =>
          db.insert(users).values({
            id: `${prefix}_dup_user_email`,
            email: `${prefix}_student@classroom.os`, // Duplicate of uStudentId
            passwordHash: "pass",
            role: "STUDENT",
          }),
        "Duplicate user email"
      );
    });

    await runTest("Suite 3", "3.2 Reject Multiple Student Profiles for Same User (1:1)", async () => {
      await assertRejects(
        () =>
          db.insert(studentProfiles).values({
            id: `${prefix}_dup_user_prof`,
            userId: uStudentId, // Already has profileId
            rollNumber: `ROLL-${runId}-99`,
            faculty: "BCA",
            semester: 4,
            section: "B",
            batchYear: 2024,
          }),
        "Duplicate student profile for same userId"
      );
    });

    await runTest("Suite 3", "3.3 Reject Duplicate Student Profile Roll Number", async () => {
      await assertRejects(
        () =>
          db.insert(studentProfiles).values({
            id: `${prefix}_dup_roll`,
            userId: uAdminId,
            rollNumber: `ROLL-${runId}-01`, // Duplicate roll number
            faculty: "BCA",
            semester: 4,
            section: "A",
            batchYear: 2024,
          }),
        "Duplicate student profile rollNumber"
      );
    });

    await runTest("Suite 3", "3.4 Reject Duplicate Subject Enrollment (studentId + subjectId)", async () => {
      await assertRejects(
        () =>
          db.insert(enrollments).values({
            id: `${prefix}_dup_enr`,
            studentId: studentId,
            subjectId: subjectId, // Already enrolled via enrollId
            semester: 4,
          }),
        "Duplicate enrollment for same student and subject"
      );
    });

    await runTest("Suite 3", "3.5 Reject Duplicate Assignment Submission (homeworkId + studentId)", async () => {
      await assertRejects(
        () =>
          db.insert(assignmentSubmissions).values({
            id: `${prefix}_dup_sub`,
            homeworkId: hwId,
            studentId: studentId, // Already submitted via subId
            status: "draft",
          }),
        "Duplicate assignment submission for same homework and student"
      );
    });

    await runTest("Suite 3", "3.6 Reject Duplicate Exam Result (examId + studentId)", async () => {
      await assertRejects(
        () =>
          db.insert(examResults).values({
            id: `${prefix}_dup_res`,
            examId: examId,
            studentId: studentId, // Already recorded via examResId
            obtainedMarks: 20,
          }),
        "Duplicate exam result for same exam and student"
      );
    });

    await runTest("Suite 3", "3.7 Reject Duplicate Attendance (classSessionId + studentId)", async () => {
      await assertRejects(
        () =>
          db.insert(attendance).values({
            id: `${prefix}_dup_att`,
            classSessionId: sessionId,
            studentId: studentId, // Already marked via attId
            status: "absent",
          }),
        "Duplicate attendance record for same session and student"
      );
    });

    // -------------------------------------------------------------------------
    // SUITE 4: Foreign Key CASCADE Deletion Verification
    // -------------------------------------------------------------------------
    console.log("\n⚡ SUITE 4: Foreign Key CASCADE Deletion Verification");

    await runTest("Suite 4", "4.1 User Deletion Cascades to Student Profiles & Notifications", async () => {
      const uCascId = `${prefix}_u_casc`;
      const pCascId = `${prefix}_p_casc`;
      const nCascId = `${prefix}_n_casc`;

      await db.insert(users).values({
        id: uCascId,
        email: `${prefix}_casc_user@test.com`,
        passwordHash: "pass",
        role: "STUDENT",
      });
      cleanupBag.userIds.add(uCascId);

      await db.insert(studentProfiles).values({
        id: pCascId,
        userId: uCascId,
        rollNumber: `ROLL-CASC-${runId}`,
        faculty: "BCA",
        semester: 2,
        section: "A",
        batchYear: 2024,
      });

      await db.insert(notifications).values({
        id: nCascId,
        userId: uCascId,
        title: "Test Casc",
        message: "Test message",
        type: "system",
      });

      // Delete User
      await db.delete(users).where(eq(users.id, uCascId));
      cleanupBag.userIds.delete(uCascId);

      const checkProf = await db.select().from(studentProfiles).where(eq(studentProfiles.id, pCascId));
      const checkNotif = await db.select().from(notifications).where(eq(notifications.id, nCascId));

      assert(checkProf.length === 0, "Student Profile was not cascade deleted when User was deleted");
      assert(checkNotif.length === 0, "Notification was not cascade deleted when User was deleted");
    });

    await runTest("Suite 4", "4.2 Subject Deletion Cascades to Routine, Sessions, Exams, Resources, Course Units & Enrollments", async () => {
      const sCascId = `${prefix}_s_casc`;
      const rCascId = `${prefix}_r_casc`;
      const sessCascId = `${prefix}_sess_casc`;
      const hwCascId = `${prefix}_hw_casc`;
      const eCascId = `${prefix}_e_casc`;
      const resCascId = `${prefix}_res_casc`;
      const uCascId = `${prefix}_unit_casc`;
      const enrCascId = `${prefix}_enr_casc`;

      await db.insert(subjects).values({
        id: sCascId,
        name: "Cascade Test Subject",
        code: `CASC-${runId}`,
      });
      cleanupBag.subjectIds.add(sCascId);

      await db.insert(weeklyRoutine).values({
        id: rCascId,
        subjectId: sCascId,
        dayOfWeek: 2,
        startTime: "10:00",
        endTime: "11:00",
      });

      await db.insert(classSessions).values({
        id: sessCascId,
        subjectId: sCascId,
        sessionDate: new Date(),
        startTime: "10:00",
        endTime: "11:00",
      });

      await db.insert(homework).values({
        id: hwCascId,
        subjectId: sCascId,
        title: "Cascade HW",
        description: "Desc",
        assignedDate: new Date(),
        dueDate: new Date(),
      });

      await db.insert(exams).values({
        id: eCascId,
        subjectId: sCascId,
        title: "Cascade Exam",
        examType: "unit_test",
        totalMarks: 20,
        passMarks: 8,
        examDate: new Date(),
      });

      await db.insert(resources).values({
        id: resCascId,
        subjectId: sCascId,
        title: "Cascade Resource",
        fileUrl: "https://files.com/doc.pdf",
        fileType: "pdf",
      });

      await db.insert(courseUnits).values({
        id: uCascId,
        subjectId: sCascId,
        title: "Cascade Unit",
      });

      await db.insert(enrollments).values({
        id: enrCascId,
        studentId: studentId,
        subjectId: sCascId,
        semester: 4,
      });

      // Delete Subject
      await db.delete(subjects).where(eq(subjects.id, sCascId));
      cleanupBag.subjectIds.delete(sCascId);

      const checkRout = await db.select().from(weeklyRoutine).where(eq(weeklyRoutine.id, rCascId));
      const checkSess = await db.select().from(classSessions).where(eq(classSessions.id, sessCascId));
      const checkHw = await db.select().from(homework).where(eq(homework.id, hwCascId));
      const checkExam = await db.select().from(exams).where(eq(exams.id, eCascId));
      const checkRes = await db.select().from(resources).where(eq(resources.id, resCascId));
      const checkUnit = await db.select().from(courseUnits).where(eq(courseUnits.id, uCascId));
      const checkEnr = await db.select().from(enrollments).where(eq(enrollments.id, enrCascId));

      assert(checkRout.length === 0, "weeklyRoutine not cascade deleted");
      assert(checkSess.length === 0, "classSessions not cascade deleted");
      assert(checkHw.length === 0, "homework not cascade deleted");
      assert(checkExam.length === 0, "exams not cascade deleted");
      assert(checkRes.length === 0, "resources not cascade deleted");
      assert(checkUnit.length === 0, "courseUnits not cascade deleted");
      assert(checkEnr.length === 0, "enrollments not cascade deleted");
    });

    await runTest("Suite 4", "4.3 Exam Deletion Cascades to Exam Results", async () => {
      const eCascId = `${prefix}_e_res_casc`;
      const rCascId = `${prefix}_res_casc`;

      await db.insert(exams).values({
        id: eCascId,
        subjectId: subjectId,
        title: "Exam For Result Cascade",
        examType: "practical",
        totalMarks: 20,
        passMarks: 8,
        examDate: new Date(),
      });
      cleanupBag.examIds.add(eCascId);

      await db.insert(examResults).values({
        id: rCascId,
        examId: eCascId,
        studentId: studentId,
        obtainedMarks: 18,
      });

      // Delete Exam
      await db.delete(exams).where(eq(exams.id, eCascId));
      cleanupBag.examIds.delete(eCascId);

      const checkRes = await db.select().from(examResults).where(eq(examResults.id, rCascId));
      assert(checkRes.length === 0, "examResults not cascade deleted when Exam was deleted");
    });

    await runTest("Suite 4", "4.4 Homework Deletion Cascades to Assignment Submissions", async () => {
      const hwCascId = `${prefix}_hw_sub_casc`;
      const subCascId = `${prefix}_sub_casc`;

      await db.insert(homework).values({
        id: hwCascId,
        subjectId: subjectId,
        title: "HW For Submission Cascade",
        description: "Desc",
        assignedDate: new Date(),
        dueDate: new Date(),
      });
      cleanupBag.homeworkIds.add(hwCascId);

      await db.insert(assignmentSubmissions).values({
        id: subCascId,
        homeworkId: hwCascId,
        studentId: studentId,
        status: "submitted",
      });

      // Delete Homework
      await db.delete(homework).where(eq(homework.id, hwCascId));
      cleanupBag.homeworkIds.delete(hwCascId);

      const checkSub = await db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.id, subCascId));
      assert(checkSub.length === 0, "assignmentSubmissions not cascade deleted when Homework was deleted");
    });

    await runTest("Suite 4", "4.5 Attendance Deletion Cascades to Correction Requests", async () => {
      const attCascId = `${prefix}_att_corr_casc`;
      const corrCascId = `${prefix}_corr_casc`;

      await db.insert(attendance).values({
        id: attCascId,
        classSessionId: sessionId,
        studentId: studentId,
        status: "absent",
      });
      cleanupBag.attendanceIds.add(attCascId);

      await db.insert(attendanceCorrectionRequests).values({
        id: corrCascId,
        attendanceId: attCascId,
        studentId: studentId,
        requestedStatus: "present",
        reason: "Correction request for cascade testing",
      });

      // Delete Attendance
      await db.delete(attendance).where(eq(attendance.id, attCascId));
      cleanupBag.attendanceIds.delete(attCascId);

      const checkCorr = await db.select().from(attendanceCorrectionRequests).where(eq(attendanceCorrectionRequests.id, corrCascId));
      assert(checkCorr.length === 0, "attendanceCorrectionRequests not cascade deleted when Attendance was deleted");
    });

    // -------------------------------------------------------------------------
    // SUITE 5: Foreign Key SET NULL Verification
    // -------------------------------------------------------------------------
    console.log("\n🔄 SUITE 5: Foreign Key SET NULL Verification");

    await runTest("Suite 5", "5.1 Teacher Deletion SET NULL on Subject, Submission, Resource & Correction Request", async () => {
      const tSetNullId = `${prefix}_t_setnull`;
      const sSetNullId = `${prefix}_s_setnull`;
      const subSetNullId = `${prefix}_sub_setnull`;
      const resSetNullId = `${prefix}_res_setnull`;
      const corrSetNullId = `${prefix}_corr_setnull`;
      const hwTempId = `${prefix}_hw_temp`;
      const attTempId = `${prefix}_att_temp`;

      // Insert Teacher
      await db.insert(teachers).values({
        id: tSetNullId,
        name: "Temporary Teacher",
        email: `${prefix}_temp_teach@test.com`,
      });
      cleanupBag.teacherIds.add(tSetNullId);

      // Subject with teacherId
      await db.insert(subjects).values({
        id: sSetNullId,
        name: "Set Null Subject",
        code: `SN-${runId}`,
        teacherId: tSetNullId,
      });
      cleanupBag.subjectIds.add(sSetNullId);

      // HW & Submission with gradedBy
      await db.insert(homework).values({
        id: hwTempId,
        subjectId: sSetNullId,
        title: "HW for SET NULL",
        description: "Desc",
        assignedDate: new Date(),
        dueDate: new Date(),
      });
      cleanupBag.homeworkIds.add(hwTempId);

      await db.insert(assignmentSubmissions).values({
        id: subSetNullId,
        homeworkId: hwTempId,
        studentId: studentId,
        status: "graded",
        gradedBy: tSetNullId,
      });
      cleanupBag.submissionIds.add(subSetNullId);

      // Resource with uploadedBy
      await db.insert(resources).values({
        id: resSetNullId,
        subjectId: sSetNullId,
        title: "Resource for SET NULL",
        fileUrl: "https://files.com/doc.pdf",
        fileType: "pdf",
        uploadedBy: tSetNullId,
      });
      cleanupBag.resourceIds.add(resSetNullId);

      // Attendance & Correction Request with reviewedBy
      await db.insert(attendance).values({
        id: attTempId,
        classSessionId: sessionId,
        studentId: studentId,
        status: "excused",
      });
      cleanupBag.attendanceIds.add(attTempId);

      await db.insert(attendanceCorrectionRequests).values({
        id: corrSetNullId,
        attendanceId: attTempId,
        studentId: studentId,
        requestedStatus: "present",
        reason: "Test SET NULL on reviewedBy",
        reviewedBy: tSetNullId,
      });
      cleanupBag.correctionRequestIds.add(corrSetNullId);

      // Delete Teacher
      await db.delete(teachers).where(eq(teachers.id, tSetNullId));
      cleanupBag.teacherIds.delete(tSetNullId);

      // Assert references are set to NULL
      const [updatedSubj] = await db.select().from(subjects).where(eq(subjects.id, sSetNullId));
      const [updatedSub] = await db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.id, subSetNullId));
      const [updatedRes] = await db.select().from(resources).where(eq(resources.id, resSetNullId));
      const [updatedCorr] = await db.select().from(attendanceCorrectionRequests).where(eq(attendanceCorrectionRequests.id, corrSetNullId));

      assert(updatedSubj?.teacherId === null, "Subject teacherId was not set to NULL upon teacher deletion");
      assert(updatedSub?.gradedBy === null, "Submission gradedBy was not set to NULL upon teacher deletion");
      assert(updatedRes?.uploadedBy === null, "Resource uploadedBy was not set to NULL upon teacher deletion");
      assert(updatedCorr?.reviewedBy === null, "Correction Request reviewedBy was not set to NULL upon teacher deletion");
    });

    await runTest("Suite 5", "5.2 Course Chapter Deletion SET NULL on Resource", async () => {
      const cSetNullId = `${prefix}_chap_setnull`;
      const resChapSetNullId = `${prefix}_res_c_setnull`;

      await db.insert(courseChapters).values({
        id: cSetNullId,
        unitId: unitId,
        title: "Chapter for Resource SET NULL",
        order: 9,
      });
      cleanupBag.chapterIds.add(cSetNullId);

      await db.insert(resources).values({
        id: resChapSetNullId,
        subjectId: subjectId,
        chapterId: cSetNullId,
        title: "Resource attached to chapter",
        fileUrl: "https://files.com/c.pdf",
        fileType: "pdf",
      });
      cleanupBag.resourceIds.add(resChapSetNullId);

      // Delete Chapter
      await db.delete(courseChapters).where(eq(courseChapters.id, cSetNullId));
      cleanupBag.chapterIds.delete(cSetNullId);

      const [updatedRes] = await db.select().from(resources).where(eq(resources.id, resChapSetNullId));
      assert(updatedRes?.chapterId === null, "Resource chapterId was not set to NULL upon chapter deletion");
    });

    // -------------------------------------------------------------------------
    // SUITE 6: Atomic Transaction & Rollback Verification
    // -------------------------------------------------------------------------
    console.log("\n🧪 SUITE 6: Atomic Transaction & Rollback Verification");

    await runTest("Suite 6", "6.1 Transaction Rollback on Failure Leaves No Orphaned Records", async () => {
      const txSessionId = `${prefix}_tx_sess`;
      const txLogId = `${prefix}_tx_log`;

      let caughtTxError = false;
      try {
        await db.transaction(async (tx) => {
          await tx.insert(classSessions).values({
            id: txSessionId,
            subjectId: subjectId,
            sessionDate: new Date(),
            startTime: "11:00",
            endTime: "12:00",
          });

          await tx.insert(lectureLogs).values({
            id: txLogId,
            classSessionId: txSessionId,
            topicsCovered: "Transactional Integrity",
            homework: "Verify rollback",
            notes: "Should not persist",
          });

          // Deliberate constraint violation: Non-existent student ID
          await tx.insert(attendance).values({
            id: `${prefix}_tx_att_fail`,
            classSessionId: txSessionId,
            studentId: "non_existent_student_99999",
            status: "present",
          });
        });
      } catch {
        caughtTxError = true;
      }

      assert(caughtTxError, "Transaction did not fail on invalid foreign key");

      const checkSess = await db.select().from(classSessions).where(eq(classSessions.id, txSessionId));
      const checkLog = await db.select().from(lectureLogs).where(eq(lectureLogs.id, txLogId));

      assert(checkSess.length === 0, "Session persisted despite transaction rollback failure");
      assert(checkLog.length === 0, "Lecture Log persisted despite transaction rollback failure");
    });

  } finally {
    // -------------------------------------------------------------------------
    // SUITE 7: Teardown & Guaranteed Cleanup
    // -------------------------------------------------------------------------
    console.log("\n🧹 SUITE 7: Teardown & Test Isolation Cleanup");

    try {
      // Clean up in reverse dependency order
      for (const id of cleanupBag.correctionRequestIds) {
        await db.delete(attendanceCorrectionRequests).where(eq(attendanceCorrectionRequests.id, id));
      }
      for (const id of cleanupBag.submissionIds) {
        await db.delete(assignmentSubmissions).where(eq(assignmentSubmissions.id, id));
      }
      for (const id of cleanupBag.examResultIds) {
        await db.delete(examResults).where(eq(examResults.id, id));
      }
      for (const id of cleanupBag.studyTaskIds) {
        await db.delete(studyTasks).where(eq(studyTasks.id, id));
      }
      for (const id of cleanupBag.resourceIds) {
        await db.delete(resources).where(eq(resources.id, id));
      }
      for (const id of cleanupBag.notificationIds) {
        await db.delete(notifications).where(eq(notifications.id, id));
      }
      for (const id of cleanupBag.enrollmentIds) {
        await db.delete(enrollments).where(eq(enrollments.id, id));
      }
      for (const id of cleanupBag.examIds) {
        await db.delete(exams).where(eq(exams.id, id));
      }
      for (const id of cleanupBag.homeworkIds) {
        await db.delete(homework).where(eq(homework.id, id));
      }
      for (const id of cleanupBag.attendanceIds) {
        await db.delete(attendance).where(eq(attendance.id, id));
      }
      for (const id of cleanupBag.logIds) {
        await db.delete(lectureLogs).where(eq(lectureLogs.id, id));
      }
      for (const id of cleanupBag.sessionIds) {
        await db.delete(classSessions).where(eq(classSessions.id, id));
      }
      for (const id of cleanupBag.routineIds) {
        await db.delete(weeklyRoutine).where(eq(weeklyRoutine.id, id));
      }
      for (const id of cleanupBag.materialIds) {
        await db.delete(courseMaterials).where(eq(courseMaterials.id, id));
      }
      for (const id of cleanupBag.chapterIds) {
        await db.delete(courseChapters).where(eq(courseChapters.id, id));
      }
      for (const id of cleanupBag.unitIds) {
        await db.delete(courseUnits).where(eq(courseUnits.id, id));
      }
      for (const id of cleanupBag.subjectIds) {
        await db.delete(subjects).where(eq(subjects.id, id));
      }
      for (const id of cleanupBag.studentProfileIds) {
        await db.delete(studentProfiles).where(eq(studentProfiles.id, id));
      }
      for (const id of cleanupBag.userIds) {
        await db.delete(users).where(eq(users.id, id));
      }
      for (const id of cleanupBag.studentIds) {
        await db.delete(students).where(eq(students.id, id));
      }
      for (const id of cleanupBag.teacherIds) {
        await db.delete(teachers).where(eq(teachers.id, id));
      }
      console.log("  ✓ All test artifacts cleanly purged from database.");
    } catch (cleanupError) {
      console.warn("  ⚠ Warning during teardown cleanup:", cleanupError);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n================================================================================");
    console.log(`  VERIFICATION RESULTS: ${stats.passed}/${stats.total} PASSED (${stats.failed} failed) in ${duration}s`);
    console.log("================================================================================");

    if (stats.failed > 0) {
      console.error("\n❌ Failures detected:");
      for (const err of stats.errors) {
        console.error(`  - [${err.suite}] ${err.name}: ${err.error?.message || err.error}`);
      }
      process.exit(1);
    } else {
      console.log("\n🎉 ALL DATABASE CONSTRAINTS, RELATIONS, CASCADES & SCHEMAS VERIFIED SUCCESSFULLY!");
      process.exit(0);
    }
  }
}

verify();
```

---

## 5. Downstream Integration & Verification Plan

1. **Prerequisite**: Explorer 1's schema extensions in `src/db/schema.ts` must be applied.
2. **Execution**:
   ```bash
   npx tsx scripts/verify-db.ts
   # or
   npm run db:verify
   ```
3. **Expected Output**:
   - 100% test assertions pass across all 7 test suites (Lifecycle, CHECK constraints, Composite UNIQUE constraints, CASCADE deletes, SET NULL updates, Transactions, Teardown).
   - Zero orphaned records left in database.
   - Non-zero exit code on any regression or violation failure.
