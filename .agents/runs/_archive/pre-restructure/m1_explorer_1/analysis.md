# Milestone 1 Schema Analysis & Technical Specification

**Author**: Explorer 1 (Milestone 1 - Database Schema Extension & Seeding Infrastructure)  
**Date**: 2026-08-15  
**Target File**: `src/db/schema.ts`  
**Database Dialect**: LibSQL / SQLite (Turso) via Drizzle ORM (`drizzle-orm` v0.45.2, `drizzle-kit` v0.31.10)

---

## 1. Executive Summary

Classroom OS requires extending its existing academic database schema from 13 tables to 23 tables to support:
1. **Authentication & RBAC**: Private session-based authentication (`users`), student academic profile decoupling (`student_profiles`), and notifications (`notifications`).
2. **Academic Workspaces & Isolation**: Subject enrollments (`enrollments`), assignment submissions (`assignment_submissions`), examinations (`exams`), exam results (`exam_results`), downloadable course resources (`resources`), personal study tasks (`study_tasks`), and formal attendance dispute resolution (`attendance_correction_requests`).
3. **Strict Database-Level Integrity**: Enforced SQLite `CHECK` constraints for all enum columns, composite `UNIQUE` constraints to prevent duplicate enrollments/submissions/results/attendance, explicit foreign keys with `onDelete: "cascade"` or `onDelete: "set null"`, and query-optimized indexes.

---

## 2. Existing Schema Patterns & Conventions in `src/db/schema.ts`

An analysis of the existing `src/db/schema.ts` establishes the canonical conventions for this repository:

| Aspect | Convention Used in Repository | Example from Codebase |
|---|---|---|
| **Primary Keys** | Text strings (`text("id").primaryKey()`) initialized with UUIDs | `id: text("id").primaryKey()` |
| **Timestamps** | `integer("col", { mode: "timestamp" }).notNull().default(sql\`(unixepoch())\`)` | `createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql\`(unixepoch())\`)` |
| **Booleans** | `integer("col", { mode: "boolean" }).notNull().default(false)` | `isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false)` |
| **JSON columns** | `text("col", { mode: "json" }).$type<T>()` | `faculties: text("faculties", { mode: "json" }).$type<string[]>()` |
| **Table Extras Syntax** | Array return syntax: `(table) => [ ... ]` | `(table) => [ unique(...), index(...), check(...) ]` |
| **Foreign Keys** | Direct `.references(() => target.id, { onDelete: "cascade" \| "set null" })` | `studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" })` |
| **CHECK Constraints** | `check("chk_name", sql\`...\`)` using template literals `${table.col}` | `check("chk_attendance_status", sql\`${table.status} IN ('present', 'absent', 'late', 'excused')\`)` |
| **Composite Unique** | `unique("unq_name").on(table.col1, table.col2)` | `unique("unq_attendance_session_student").on(table.classSessionId, table.studentId)` |

---

## 3. Detailed Specifications for 10 New Tables

### Table 1: `users` (`users`)
Auth identity table storing hashed credentials, roles, quarantine status, and account activation.

```typescript
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // 'ADMIN' | 'TEACHER' | 'CR' | 'STUDENT'
  mustChangePassword: integer("must_change_password", { mode: "boolean" })
    .notNull()
    .default(true),
  isActive: integer("is_active", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_users_role").on(table.role),
  check("chk_users_role", sql`${table.role} IN ('ADMIN', 'TEACHER', 'CR', 'STUDENT')`),
]);
```

### Table 2: `studentProfiles` (`student_profiles`)
Academic profile linked 1:1 to a User, storing institutional student details (roll number, faculty, semester, batch year, section).

```typescript
export const studentProfiles = sqliteTable("student_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rollNumber: text("roll_number").notNull().unique(),
  faculty: text("faculty").notNull(),
  semester: integer("semester").notNull(),
  section: text("section").notNull(),
  batchYear: integer("batch_year").notNull(),
  phone: text("phone"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_student_profiles_user_id").on(table.userId),
  index("idx_student_profiles_faculty_semester").on(table.faculty, table.semester),
  check("chk_student_profiles_semester", sql`${table.semester} BETWEEN 1 AND 8`),
]);
```

### Table 3: `enrollments` (`enrollments`)
Subject enrollment link table mapping students to subjects they are currently studying.

```typescript
export const enrollments = sqliteTable("enrollments", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  semester: integer("semester").notNull(),
  enrolledAt: integer("enrolled_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_enrollments_student_subject").on(table.studentId, table.subjectId),
  index("idx_enrollments_student_id").on(table.studentId),
  index("idx_enrollments_subject_id").on(table.subjectId),
  check("chk_enrollments_semester", sql`${table.semester} BETWEEN 1 AND 8`),
]);
```

### Table 4: `assignmentSubmissions` (`assignment_submissions`)
Student submissions for assignments (`homework`), with text answers, UploadThing file metadata, grading, and teacher feedback.

```typescript
export const assignmentSubmissions = sqliteTable("assignment_submissions", {
  id: text("id").primaryKey(),
  homeworkId: text("homework_id")
    .notNull()
    .references(() => homework.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  content: text("content"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  status: text("status").notNull().default("draft"), // 'draft' | 'submitted' | 'graded' | 'late'
  submittedAt: integer("submitted_at", { mode: "timestamp" }),
  grade: text("grade"),
  score: integer("score"),
  feedback: text("feedback"),
  gradedBy: text("graded_by")
    .references(() => teachers.id, { onDelete: "set null" }),
  gradedAt: integer("graded_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_assignment_submissions_homework_student").on(table.homeworkId, table.studentId),
  index("idx_assignment_submissions_student").on(table.studentId),
  index("idx_assignment_submissions_homework").on(table.homeworkId),
  index("idx_assignment_submissions_status").on(table.status),
  check("chk_assignment_submissions_status", sql`${table.status} IN ('draft', 'submitted', 'graded', 'late')`),
  check("chk_assignment_submissions_score", sql`${table.score} IS NULL OR ${table.score} >= 0`),
]);
```

### Table 5: `exams` (`exams`)
Internal assessments, unit tests, pre-boards, and final exams for subjects.

```typescript
export const exams = sqliteTable("exams", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  examType: text("exam_type").notNull(), // 'unit_test' | 'midterm' | 'pre_board' | 'practical' | 'final'
  totalMarks: integer("total_marks").notNull(),
  passMarks: integer("pass_marks").notNull(),
  examDate: integer("exam_date", { mode: "timestamp" }).notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  room: text("room"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_exams_subject_date").on(table.subjectId, table.examDate),
  check("chk_exams_type", sql`${table.examType} IN ('unit_test', 'midterm', 'pre_board', 'practical', 'final')`),
  check("chk_exams_marks", sql`${table.totalMarks} > 0 AND ${table.passMarks} >= 0 AND ${table.passMarks} <= ${table.totalMarks}`),
  check("chk_exams_time", sql`(${table.startTime} IS NULL AND ${table.endTime} IS NULL) OR (${table.startTime} IS NOT NULL AND ${table.endTime} IS NOT NULL AND ${table.endTime} > ${table.startTime})`),
]);
```

### Table 6: `examResults` (`exam_results`)
Grading and marks obtained by students on exams.

```typescript
export const examResults = sqliteTable("exam_results", {
  id: text("id").primaryKey(),
  examId: text("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  obtainedMarks: integer("obtained_marks"),
  isAbsent: integer("is_absent", { mode: "boolean" })
    .notNull()
    .default(false),
  remarks: text("remarks"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_exam_results_exam_student").on(table.examId, table.studentId),
  index("idx_exam_results_student").on(table.studentId),
  index("idx_exam_results_exam").on(table.examId),
  check("chk_exam_results_marks", sql`${table.obtainedMarks} IS NULL OR ${table.obtainedMarks} >= 0`),
]);
```

### Table 7: `resources` (`resources`)
Downloadable study materials, slides, lecture notes, syllabus PDFs, and lab manuals attached to subjects and chapters.

```typescript
export const resources = sqliteTable("resources", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id")
    .references(() => courseChapters.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // 'pdf' | 'slides' | 'link' | 'zip' | 'code' | 'doc'
  fileSize: integer("file_size"),
  uploadedBy: text("uploaded_by")
    .references(() => teachers.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_resources_subject").on(table.subjectId),
  index("idx_resources_chapter").on(table.chapterId),
  index("idx_resources_uploaded_by").on(table.uploadedBy),
]);
```

### Table 8: `studyTasks` (`study_tasks`)
Personal student task management / to-do tracking for revision and assignments.

```typescript
export const studyTasks = sqliteTable("study_tasks", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  subjectId: text("subject_id")
    .references(() => subjects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  status: text("status").notNull().default("pending"), // 'pending' | 'in_progress' | 'completed'
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high'
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_study_tasks_student_status").on(table.studentId, table.status),
  index("idx_study_tasks_student_due").on(table.studentId, table.dueDate),
  check("chk_study_tasks_status", sql`${table.status} IN ('pending', 'in_progress', 'completed')`),
  check("chk_study_tasks_priority", sql`${table.priority} IN ('low', 'medium', 'high')`),
]);
```

### Table 9: `notifications` (`notifications`)
In-app notifications for users regarding assignments, attendance corrections, exams, and system announcements.

```typescript
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'system' | 'assignment' | 'attendance' | 'notice' | 'exam' | 'correction_request'
  link: text("link"),
  isRead: integer("is_read", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_notifications_user_unread").on(table.userId, table.isRead),
  index("idx_notifications_user_created").on(table.userId, table.createdAt),
  check("chk_notifications_type", sql`${table.type} IN ('system', 'assignment', 'attendance', 'notice', 'exam', 'correction_request')`),
]);
```

### Table 10: `attendanceCorrectionRequests` (`attendance_correction_requests`)
Student dispute workflow to report incorrect attendance records for teacher/admin review.

```typescript
export const attendanceCorrectionRequests = sqliteTable("attendance_correction_requests", {
  id: text("id").primaryKey(),
  attendanceId: text("attendance_id")
    .notNull()
    .references(() => attendance.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  requestedStatus: text("requested_status").notNull(), // 'present' | 'excused'
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  reviewedBy: text("reviewed_by")
    .references(() => teachers.id, { onDelete: "set null" }),
  reviewNote: text("review_note"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_attendance_correction_student").on(table.studentId),
  index("idx_attendance_correction_attendance").on(table.attendanceId),
  index("idx_attendance_correction_status").on(table.status),
  check("chk_attendance_correction_requested_status", sql`${table.requestedStatus} IN ('present', 'excused')`),
  check("chk_attendance_correction_status", sql`${table.status} IN ('pending', 'approved', 'rejected')`),
]);
```

---

## 4. Complete Relations Matrix

All 21 Drizzle relation definitions connecting legacy and new tables:

```typescript
// --- Drizzle Relations ---

export const teachersRelations = relations(teachers, ({ many }) => ({
  subjects: many(subjects),
  assignmentSubmissionsGraded: many(assignmentSubmissions),
  resources: many(resources),
  attendanceCorrectionsReviewed: many(attendanceCorrectionRequests),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  teacher: one(teachers, {
    fields: [subjects.teacherId],
    references: [teachers.id],
  }),
  classSessions: many(classSessions),
  weeklyRoutine: many(weeklyRoutine),
  homework: many(homework),
  courseUnits: many(courseUnits),
  enrollments: many(enrollments),
  exams: many(exams),
  resources: many(resources),
  studyTasks: many(studyTasks),
}));

export const studentsRelations = relations(students, ({ many }) => ({
  attendance: many(attendance),
  enrollments: many(enrollments),
  assignmentSubmissions: many(assignmentSubmissions),
  examResults: many(examResults),
  studyTasks: many(studyTasks),
  attendanceCorrectionRequests: many(attendanceCorrectionRequests),
}));

export const weeklyRoutineRelations = relations(weeklyRoutine, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [weeklyRoutine.subjectId],
    references: [subjects.id],
  }),
  classSessions: many(classSessions),
}));

export const classSessionsRelations = relations(classSessions, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [classSessions.subjectId],
    references: [subjects.id],
  }),
  routine: one(weeklyRoutine, {
    fields: [classSessions.routineId],
    references: [weeklyRoutine.id],
  }),
  lectureLog: one(lectureLogs, {
    fields: [classSessions.id],
    references: [lectureLogs.classSessionId],
  }),
  attendance: many(attendance),
  homework: many(homework),
}));

export const lectureLogsRelations = relations(lectureLogs, ({ one }) => ({
  classSession: one(classSessions, {
    fields: [lectureLogs.classSessionId],
    references: [classSessions.id],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one, many }) => ({
  classSession: one(classSessions, {
    fields: [attendance.classSessionId],
    references: [classSessions.id],
  }),
  student: one(students, {
    fields: [attendance.studentId],
    references: [students.id],
  }),
  correctionRequests: many(attendanceCorrectionRequests),
}));

export const homeworkRelations = relations(homework, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [homework.subjectId],
    references: [subjects.id],
  }),
  session: one(classSessions, {
    fields: [homework.sessionId],
    references: [classSessions.id],
  }),
  submissions: many(assignmentSubmissions),
}));

export const courseUnitsRelations = relations(courseUnits, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [courseUnits.subjectId],
    references: [subjects.id],
  }),
  courseChapters: many(courseChapters),
}));

export const courseChaptersRelations = relations(courseChapters, ({ one, many }) => ({
  unit: one(courseUnits, {
    fields: [courseChapters.unitId],
    references: [courseUnits.id],
  }),
  courseMaterials: many(courseMaterials),
  resources: many(resources),
}));

export const courseMaterialsRelations = relations(courseMaterials, ({ one }) => ({
  chapter: one(courseChapters, {
    fields: [courseMaterials.chapterId],
    references: [courseChapters.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  studentProfile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
  notifications: many(notifications),
}));

export const studentProfilesRelations = relations(studentProfiles, ({ one }) => ({
  user: one(users, {
    fields: [studentProfiles.userId],
    references: [users.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(students, {
    fields: [enrollments.studentId],
    references: [students.id],
  }),
  subject: one(subjects, {
    fields: [enrollments.subjectId],
    references: [subjects.id],
  }),
}));

export const assignmentSubmissionsRelations = relations(assignmentSubmissions, ({ one }) => ({
  homework: one(homework, {
    fields: [assignmentSubmissions.homeworkId],
    references: [homework.id],
  }),
  student: one(students, {
    fields: [assignmentSubmissions.studentId],
    references: [students.id],
  }),
  gradedByTeacher: one(teachers, {
    fields: [assignmentSubmissions.gradedBy],
    references: [teachers.id],
  }),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [exams.subjectId],
    references: [subjects.id],
  }),
  results: many(examResults),
}));

export const examResultsRelations = relations(examResults, ({ one }) => ({
  exam: one(exams, {
    fields: [examResults.examId],
    references: [exams.id],
  }),
  student: one(students, {
    fields: [examResults.studentId],
    references: [students.id],
  }),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  subject: one(subjects, {
    fields: [resources.subjectId],
    references: [subjects.id],
  }),
  chapter: one(courseChapters, {
    fields: [resources.chapterId],
    references: [courseChapters.id],
  }),
  uploadedByTeacher: one(teachers, {
    fields: [resources.uploadedBy],
    references: [teachers.id],
  }),
}));

export const studyTasksRelations = relations(studyTasks, ({ one }) => ({
  student: one(students, {
    fields: [studyTasks.studentId],
    references: [students.id],
  }),
  subject: one(subjects, {
    fields: [studyTasks.subjectId],
    references: [subjects.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const attendanceCorrectionRequestsRelations = relations(attendanceCorrectionRequests, ({ one }) => ({
  attendance: one(attendance, {
    fields: [attendanceCorrectionRequests.attendanceId],
    references: [attendance.id],
  }),
  student: one(students, {
    fields: [attendanceCorrectionRequests.studentId],
    references: [students.id],
  }),
  reviewedByTeacher: one(teachers, {
    fields: [attendanceCorrectionRequests.reviewedBy],
    references: [teachers.id],
  }),
}));
```

---

## 5. TypeScript Inferred Types & Enums

Exported types to provide complete type inference across the application:

```typescript
// --- TypeScript Types ---

export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

export type WeeklyRoutine = typeof weeklyRoutine.$inferSelect;
export type NewWeeklyRoutine = typeof weeklyRoutine.$inferInsert;

export type ClassSession = typeof classSessions.$inferSelect;
export type NewClassSession = typeof classSessions.$inferInsert;

export type LectureLog = typeof lectureLogs.$inferSelect;
export type NewLectureLog = typeof lectureLogs.$inferInsert;

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;
export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type Homework = typeof homework.$inferSelect;
export type NewHomework = typeof homework.$inferInsert;
export type HomeworkStatus = "active" | "completed" | "archived";

export type Notice = typeof notices.$inferSelect;
export type NewNotice = typeof notices.$inferInsert;

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

export type CourseUnit = typeof courseUnits.$inferSelect;
export type NewCourseUnit = typeof courseUnits.$inferInsert;

export type CourseChapter = typeof courseChapters.$inferSelect;
export type NewCourseChapter = typeof courseChapters.$inferInsert;

export type CourseMaterial = typeof courseMaterials.$inferSelect;
export type NewCourseMaterial = typeof courseMaterials.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = "ADMIN" | "TEACHER" | "CR" | "STUDENT";

export type StudentProfile = typeof studentProfiles.$inferSelect;
export type NewStudentProfile = typeof studentProfiles.$inferInsert;

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;

export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type NewAssignmentSubmission = typeof assignmentSubmissions.$inferInsert;
export type SubmissionStatus = "draft" | "submitted" | "graded" | "late";

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type ExamType = "unit_test" | "midterm" | "pre_board" | "practical" | "final";

export type ExamResult = typeof examResults.$inferSelect;
export type NewExamResult = typeof examResults.$inferInsert;

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;

export type StudyTask = typeof studyTasks.$inferSelect;
export type NewStudyTask = typeof studyTasks.$inferInsert;
export type StudyTaskStatus = "pending" | "in_progress" | "completed";
export type StudyTaskPriority = "low" | "medium" | "high";

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationType = "system" | "assignment" | "attendance" | "notice" | "exam" | "correction_request";

export type AttendanceCorrectionRequest = typeof attendanceCorrectionRequests.$inferSelect;
export type NewAttendanceCorrectionRequest = typeof attendanceCorrectionRequests.$inferInsert;
export type CorrectionRequestedStatus = "present" | "excused";
export type CorrectionRequestStatus = "pending" | "approved" | "rejected";
```

---

## 6. Cascade & Lifecycle Integrity Verification

When updating `scripts/verify-db.ts`, the following verification checkpoints must be executed:
1. **User Role CHECK**: Rejects invalid role (e.g. `'SUPERADMIN'`).
2. **User Deletion Cascade**: Deleting a `User` cascades to `studentProfiles` and `notifications`.
3. **Student Deletion Cascade**: Deleting a `Student` cascades to `enrollments`, `attendance`, `assignmentSubmissions`, `examResults`, `studyTasks`, and `attendanceCorrectionRequests`.
4. **Subject Deletion Cascade**: Deleting a `Subject` cascades to `weeklyRoutine`, `classSessions`, `courseUnits`, `homework`, `exams`, `resources`, and `enrollments`. Setting null on `studyTasks.subjectId`.
5. **Teacher Deletion Set Null**: Deleting a `Teacher` sets null on `subjects.teacherId`, `assignmentSubmissions.gradedBy`, `resources.uploadedBy`, and `attendanceCorrectionRequests.reviewedBy`.
6. **Composite Unique Rejections**:
   - `enrollments`: Rejects duplicate `(studentId, subjectId)`.
   - `assignmentSubmissions`: Rejects duplicate `(homeworkId, studentId)`.
   - `examResults`: Rejects duplicate `(examId, studentId)`.
   - `attendance`: Rejects duplicate `(classSessionId, studentId)`.
7. **Enum CHECK Rejections**:
   - `assignmentSubmissions.status`: Rejects `'cheating'`.
   - `exams.examType`: Rejects `'pop_quiz'`.
   - `studyTasks.status`: Rejects `'abandoned'`.
   - `studyTasks.priority`: Rejects `'urgent'`.
   - `notifications.type`: Rejects `'spam'`.
   - `attendanceCorrectionRequests.requestedStatus`: Rejects `'absent'`.
   - `attendanceCorrectionRequests.status`: Rejects `'settled'`.
8. **Relational Query Verification**: `db.query` queries successfully hydrate 2-level deep nested relations (e.g. `exams -> results -> student`, `homework -> submissions -> student`, `users -> studentProfile`, `subjects -> enrollments -> student`).

---

## 7. Migration & Seeder Instructions for Builders

- **Migration**: Run `npx drizzle-kit generate` to generate migration SQL from the updated `src/db/schema.ts`.
- **Seeder (`src/db/seed.ts`)**:
  - Should insert Admin (`admin@classroomos.edu.np`, hashed password with `scrypt`), 4 Teachers, 1 CR, and at least 15 Students.
  - Create 6 Tribhuvan University BCA/CSIT subjects (e.g., C Programming, Data Structures & Algorithms, Database Management Systems, Computer Networks, Operating Systems, Web Technology).
  - Create full semester weekly routines (Sunday to Friday).
  - Create 45 historical sessions across past 9 weeks.
  - Generate attendance across all 4 zones:
    - **Safe Zone (>85%)**: High attendance students.
    - **Caution Zone (75-80%)**: At-risk students near threshold.
    - **Danger Zone (<70%)**: Attendance deficit requiring recovery.
    - **Perfect Zone (100%)**: Top CR / diligent students.
  - Create Homework, Submissions (drafts, graded, late), Exams, Exam Results, Resources, Study Tasks, Notices, Events, and Correction Requests.
