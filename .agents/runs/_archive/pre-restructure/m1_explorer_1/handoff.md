# Handoff Report: Milestone 1 Schema Extension Investigation

**Agent**: Explorer 1 (`m1_explorer_1`)  
**Parent Agent**: `sub_orch_m1` (`8a63ca24-dda9-4209-bd5b-b5898325a6ba`)  
**Target Milestone**: Milestone 1 (Database Schema Extension & Seeding Infrastructure)  
**Date**: 2026-08-15  

---

## 1. Observation

1. **Existing Schema (`src/db/schema.ts`)**:
   - Contains 13 tables: `teachers` (line 7), `subjects` (line 22), `students` (line 33), `weeklyRoutine` (line 46), `classSessions` (line 70), `lectureLogs` (line 88), `attendance` (line 102), `homework` (line 120), `notices` (line 145), `events` (line 161), `courseUnits` (line 183), `courseChapters` (line 200), `courseMaterials` (line 217).
   - Uses Drizzle ORM array syntax for table extras: `(table) => [ index(...), check(...), unique(...) ]` (e.g. `attendance` lines 114-118, `weeklyRoutine` lines 63-68).
   - Uses `integer("col", { mode: "timestamp" }).notNull().default(sql\`(unixepoch())\`)` for dates/timestamps.
   - Uses `integer("col", { mode: "boolean" }).notNull().default(false)` for booleans.
   - Uses `.references(() => targetTable.id, { onDelete: "cascade" | "set null" })` for foreign keys.

2. **Drizzle & Database Configuration**:
   - `drizzle-orm` version: `0.45.2`, `drizzle-kit` version: `0.31.10`, `@libsql/client` version: `0.17.4` in `package.json` (lines 18, 23, 42).
   - `drizzle.config.ts` dialect: `dialect: "turso"`, schema: `"./src/db/schema.ts"`, out: `"./drizzle"`.
   - `src/db/client.ts` exports `db = drizzle(client, { schema })`.

3. **Scope Specification (`.agents/sub_orch_m1/SCOPE.md` lines 13-24)**:
   - Prescribes 10 new tables: `users`, `student_profiles`, `enrollments`, `assignment_submissions`, `exams`, `exam_results`, `resources`, `study_tasks`, `notifications`, `attendance_correction_requests`.
   - Outlines composite unique constraints on `(studentId, subjectId)` in enrollments, `(homeworkId, studentId)` in submissions, and `(examId, studentId)` in exam results.
   - Outlines SQLite `CHECK` constraints on all enum status/type/role/marks/date fields.

4. **Verification Script (`scripts/verify-db.ts`)**:
   - Currently verifies `subjects`, `students`, `classSessions`, `lectureLogs`, `attendance` relational queries, duplicate attendance rejection, invalid status CHECK rejection, and cascade deletion.

---

## 2. Logic Chain

1. **Schema Extension Design**:
   - Based on *Observation 1* and *Observation 3*, 10 new tables are designed adhering strictly to existing conventions:
     - `users`: Includes email unique, passwordHash, role CHECK in `('ADMIN', 'TEACHER', 'CR', 'STUDENT')`, mustChangePassword boolean, isActive boolean.
     - `studentProfiles`: 1:1 with users via unique `userId` FK cascade, unique rollNumber, semester CHECK `1..8`.
     - `enrollments`: FK cascade to `students` and `subjects`, composite unique on `(studentId, subjectId)`.
     - `assignmentSubmissions`: FK cascade to `homework` and `students`, composite unique `(homeworkId, studentId)`, status CHECK `('draft', 'submitted', 'graded', 'late')`, score non-negative check, gradedBy FK set null to `teachers`.
     - `exams`: FK cascade to `subjects`, examType CHECK `('unit_test', 'midterm', 'pre_board', 'practical', 'final')`, marks consistency check, start/end time chronological check.
     - `examResults`: FK cascade to `exams` and `students`, composite unique `(examId, studentId)`, non-negative obtainedMarks check.
     - `resources`: FK cascade to `subjects`, FK set null to `courseChapters` and `teachers`.
     - `studyTasks`: FK cascade to `students`, FK set null to `subjects`, status CHECK `('pending', 'in_progress', 'completed')`, priority CHECK `('low', 'medium', 'high')`.
     - `notifications`: FK cascade to `users`, type CHECK `('system', 'assignment', 'attendance', 'notice', 'exam', 'correction_request')`, unread index.
     - `attendanceCorrectionRequests`: FK cascade to `attendance` and `students`, FK set null to `teachers`, requestedStatus CHECK `('present', 'excused')`, status CHECK `('pending', 'approved', 'rejected')`.

2. **Relational Graph Interconnection**:
   - Based on *Observation 1*, updated `teachersRelations`, `subjectsRelations`, `studentsRelations`, `attendanceRelations`, `homeworkRelations`, and `courseChaptersRelations` to connect backward and forward links with all 10 new tables.
   - Defined 10 new relations configurations providing seamless `db.query.<table_name>.findMany({ with: { ... } })` access.

3. **Type Safety & Export Architecture**:
   - Inferred select/insert types for all 23 tables plus union type aliases (`UserRole`, `SubmissionStatus`, `ExamType`, `StudyTaskStatus`, `StudyTaskPriority`, `NotificationType`, `CorrectionRequestStatus`) exported from `src/db/schema.ts` for clean downstream consumption across M2 (Auth), M3 (Academic Workspaces), and E2E testing.

---

## 3. Caveats

- **libSQL Local vs Remote URL**: The tests and scripts run against the local SQLite database configured via `DATABASE_URL` in `.env.local`. When running migrations, ensure foreign keys are enabled (`PRAGMA foreign_keys = ON;`).
- **Student Profile vs Student Academic Record**: `studentProfiles` is linked to `users` (auth identity) with rollNumber, while `students` represents the academic roster linked to attendance and grades. This decoupling satisfies Requirement R1.

---

## 4. Conclusion

The complete Drizzle schema design with 10 new tables, 21 relations, full SQLite `CHECK` and composite `UNIQUE` constraints, and TypeScript types is finalized and documented in `D:\CLASSROOM OS\.agents\m1_explorer_1\analysis.md`. The implementation plan is ready for the schema builder to implement directly into `src/db/schema.ts`.

---

## 5. Verification Method

1. **Verify Analysis Report**:
   Inspect `D:\CLASSROOM OS\.agents\m1_explorer_1\analysis.md` for complete table schemas, relations, and type definitions.
2. **Post-Implementation Compilation Check**:
   Once applied to `src/db/schema.ts`, verify with:
   ```bash
   npx tsc --noEmit
   ```
3. **Database Migration Verification**:
   ```bash
   npm run db:generate
   ```
4. **Lifecycle Verification Test**:
   ```bash
   npm run db:verify
   ```
