# Scope: Milestone 1 — Database Schema Extension & Seeding Infrastructure

## Architecture
Milestone 1 establishes the relational foundation and data persistence layer for Classroom OS.
It expands the database from 13 legacy tables to 23 full-featured tables using Drizzle ORM and Turso/libSQL (SQLite), complete with:
- SQLite engine-level `CHECK` constraints on enums, ranges, and temporal/numeric logic.
- Composite `UNIQUE` indexes for domain-level data integrity.
- Explicit Foreign Key referential integrity actions (`CASCADE` downwards, `SET NULL` on optional references).
- Complete Drizzle relational queries mapping 1:1, 1:N, and N:M associations.
- Comprehensive 7-suite verification script (`scripts/verify-db.ts`, 31 tests).
- Realistic academic semester database seeder (`src/db/seed.ts`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Extended Database Schema | 10 new tables (`users`, `student_profiles`, `enrollments`, `assignment_submissions`, `exams`, `exam_results`, `resources`, `study_tasks`, `notifications`, `attendance_correction_requests`) with SQLite CHECK constraints, unique indexes, cascading FKs | M1 | ORIGINAL_REQUEST §R4 |
| F2 | Database Verification & Migration | Drizzle migration scripts and extended `scripts/verify-db.ts` verifying all constraints, unique violations, enum rejections, cascade deletes | M1 | ORIGINAL_REQUEST §Acceptance Criteria |
| F3 | Comprehensive Database Seeder | `src/db/seed.ts` populating Admin, Teachers, CR, Students, Subjects, Routine, 45 historical Sessions, Attendance zones, Assignments, Submissions, Notices | M1 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones Breakdown
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1.1 | Schema Extension & Relations | Implement 10 new tables in `src/db/schema.ts`, relations, and TypeScript types | None | DONE |
| M1.2 | Database Verification Suite | Extend `scripts/verify-db.ts` covering 7 suites and 31 test assertions | M1.1 | DONE |
| M1.3 | Database Seeder | Implement `src/db/seed.ts` populating realistic TU BCA 4th semester data | M1.1 | DONE |
| M1.4 | Verification Gate | 2 Reviewers, 2 Challengers, 1 Forensic Auditor gate verification | M1.1, M1.2, M1.3 | IN_PROGRESS |

## Interface Contracts & DB Exports (`src/db/schema.ts`)
- 23 SQLite Tables: `users`, `studentProfiles`, `teachers`, `subjects`, `students`, `enrollments`, `weeklyRoutine`, `classSessions`, `lectureLogs`, `attendance`, `attendanceCorrectionRequests`, `homework`, `assignmentSubmissions`, `exams`, `examResults`, `courseUnits`, `courseChapters`, `courseMaterials`, `resources`, `studyTasks`, `notices`, `events`, `notifications`.
- Inferred Types: `User`, `NewUser`, `StudentProfile`, `NewStudentProfile`, `Enrollment`, `NewEnrollment`, `AssignmentSubmission`, `NewAssignmentSubmission`, `Exam`, `NewExam`, `ExamResult`, `NewExamResult`, `Resource`, `NewResource`, `StudyTask`, `NewStudyTask`, `Notification`, `NewNotification`, `AttendanceCorrectionRequest`, `NewAttendanceCorrectionRequest`.
