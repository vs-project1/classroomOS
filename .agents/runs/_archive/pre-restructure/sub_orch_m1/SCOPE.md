# Scope: Milestone 1 (Database Schema Extension & Seeding Infrastructure)

## Architecture & Overview
Extend the SQLite Drizzle schema in `src/db/schema.ts` to support the complete multi-role educational platform data model with SQLite CHECK constraints, Foreign Key cascades, and composite UNIQUE constraints. Update the verification suite `scripts/verify-db.ts` to test all new constraints and lifecycle behaviors. Implement `src/db/seed.ts` with rich, realistic mock data for 45 sessions, attendance zones, assignments, submissions, exams, study tasks, and notices.

## Feature Inventory Mapping
| # | Feature | Description | Status |
|---|---------|-------------|--------|
| F1 | 10 New Tables in `schema.ts` | `users`, `student_profiles`, `enrollments`, `assignment_submissions`, `exams`, `exam_results`, `resources`, `study_tasks`, `notifications`, `attendance_correction_requests` + relations | In Progress |
| F2 | Verification Suite in `scripts/verify-db.ts` | Lifecycle testing: constraint violations, CHECK rejections, composite unique rejections, foreign key cascades | Planned |
| F3 | Seeding Script in `src/db/seed.ts` | Realistic database seed: Admin, Teachers, CR, Students, Subjects, Routine, 45 historical Sessions, realistic Attendance zones (Safe, Caution, Danger, Perfect), Assignments, Submissions, Notices, and Events | Planned |

## Detailed Table Specifications
1. **users**: id (text pk), email (text unique not null), passwordHash (text not null), role (text not null, CHECK in 'ADMIN','TEACHER','CR','STUDENT'), mustChangePassword (integer default 1), isActive (integer default 1), createdAt, updatedAt
2. **student_profiles** (`studentProfiles`): id (text pk), userId (text not null fk users.id on delete cascade), rollNumber (text unique not null), faculty (text not null), semester (integer not null), section (text not null), batchYear (integer not null), phone (text), createdAt, updatedAt
3. **enrollments**: id (text pk), studentId (text not null fk students.id on delete cascade), subjectId (text not null fk subjects.id on delete cascade), semester (integer not null), enrolledAt (text not null), unique(studentId, subjectId)
4. **assignment_submissions** (`assignmentSubmissions`): id (text pk), homeworkId (text not null fk homework.id on delete cascade), studentId (text not null fk students.id on delete cascade), content (text), fileUrl (text), fileName (text), fileSize (integer), status (text not null, CHECK in 'draft','submitted','graded','late'), submittedAt (text), grade (text), score (integer), feedback (text), gradedBy (text fk teachers.id on delete set null), gradedAt (text), createdAt, updatedAt, unique(homeworkId, studentId)
5. **exams**: id (text pk), subjectId (text not null fk subjects.id on delete cascade), title (text not null), examType (text not null, CHECK in 'unit_test','midterm','pre_board','practical','final'), totalMarks (integer not null), passMarks (integer not null), examDate (text not null), startTime (text), endTime (text), room (text), createdAt, updatedAt
6. **exam_results** (`examResults`): id (text pk), examId (text not null fk exams.id on delete cascade), studentId (text not null fk students.id on delete cascade), obtainedMarks (integer), isAbsent (integer default 0), remarks (text), createdAt, updatedAt, unique(examId, studentId)
7. **resources**: id (text pk), subjectId (text not null fk subjects.id on delete cascade), chapterId (text fk chapters.id on delete set null), title (text not null), description (text), fileUrl (text not null), fileType (text not null), fileSize (integer), uploadedBy (text fk teachers.id on delete set null), createdAt, updatedAt
8. **study_tasks** (`studyTasks`): id (text pk), studentId (text not null fk students.id on delete cascade), subjectId (text fk subjects.id on delete set null), title (text not null), description (text), dueDate (text), status (text not null, CHECK in 'pending','in_progress','completed'), priority (text not null, CHECK in 'low','medium','high'), createdAt, updatedAt
9. **notifications**: id (text pk), userId (text not null fk users.id on delete cascade), title (text not null), message (text not null), type (text not null, CHECK in 'system','assignment','attendance','notice','exam','correction_request'), link (text), isRead (integer default 0), createdAt (text not null)
10. **attendance_correction_requests** (`attendanceCorrectionRequests`): id (text pk), attendanceId (text not null fk attendance.id on delete cascade), studentId (text not null fk students.id on delete cascade), requestedStatus (text not null, CHECK in 'present','excused'), reason (text not null), status (text not null, CHECK in 'pending','approved','rejected'), reviewedBy (text fk teachers.id on delete set null), reviewNote (text), reviewedAt (text), createdAt, updatedAt
11. **Relations**: Drizzle relations defining all 1:1, 1:N, and N:M links among existing and new tables.

## Code Layout Ownership for M1
- Primary: `src/db/schema.ts`
- Verification: `scripts/verify-db.ts`
- Seeding: `src/db/seed.ts`
- Package / Scripts: `package.json` (if seed script runner needs adding or updating)
