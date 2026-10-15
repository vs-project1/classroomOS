import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer, unique, index, uniqueIndex, check } from "drizzle-orm/sqlite-core";

// Note on hard deletion: Hard deletion is acceptable for the current prototype.
// A soft deletion strategy may be introduced later if audit trails are required.

export const teachers = sqliteTable("teachers", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").unique(),
  phone: text("phone"),
  faculties: text("faculties", { mode: "json" }).$type<string[]>(),
  semesters: text("semesters", { mode: "json" }).$type<string[]>(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_teachers_user_id").on(table.userId),
]);

export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  code: text("code").notNull().unique(),
  semester: integer("semester").notNull().default(1),
  teacherId: text("teacher_id")
    .references(() => teachers.id, { onDelete: "set null" }),
  isActive: integer("is_active", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_subjects_semester").on(table.semester),
  index("idx_subjects_teacher_id").on(table.teacherId),
  index("idx_subjects_is_active").on(table.isActive),
  check("chk_subjects_semester", sql`${table.semester} BETWEEN 1 AND 8`),
]);

export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  rollNumber: text("roll_number").notNull().unique(),
  email: text("email").unique(),
  phone: text("phone"),
  faculty: text("faculty").notNull().default("BCA"),
  semester: integer("semester").notNull(),
  section: text("section").notNull().default("A"),
  batchYear: integer("batch_year").notNull().default(2025),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_students_cohort").on(table.faculty, table.semester, table.section),
  check("chk_students_semester", sql`${table.semester} BETWEEN 1 AND 8`),
]);

export const weeklyRoutine = sqliteTable("weekly_routine", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .references(() => subjects.id, { onDelete: "restrict" }),
  semester: integer("semester").notNull().default(1),
  slotType: text("slot_type").notNull().default("LECTURE"),
  customTitle: text("custom_title"),
  section: text("section").notNull().default("A"),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  teacherId: text("teacher_id")
    .references(() => teachers.id, { onDelete: "set null" }),
  room: text("room"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_weekly_routine_day_time").on(table.dayOfWeek, table.startTime),
  index("idx_weekly_routine_subject").on(table.subjectId),
  index("idx_weekly_routine_teacher").on(table.teacherId),
  index("idx_weekly_routine_section").on(table.section),
  index("idx_weekly_routine_semester").on(table.semester),
  index("idx_weekly_routine_sem_sec").on(table.semester, table.section),
  check("chk_weekly_routine_day", sql`${table.dayOfWeek} BETWEEN 0 AND 6`),
  check("chk_weekly_routine_time", sql`${table.startTime} < ${table.endTime}`),
  check("chk_weekly_routine_type", sql`${table.slotType} IN ('LECTURE', 'LAB', 'BREAK', 'ECA', 'LIBRARY')`),
  check("chk_weekly_routine_semester", sql`${table.semester} BETWEEN 1 AND 8`),
]);

export const classSessions = sqliteTable("class_sessions", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "restrict" }),
  routineId: text("routine_id")
    .references(() => weeklyRoutine.id, { onDelete: "set null" }),
  sessionDate: integer("session_date", { mode: "timestamp" }).notNull(),
  section: text("section").notNull().default("A"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_class_sessions_subject_id").on(table.subjectId),
  index("idx_class_sessions_session_date").on(table.sessionDate),
  index("idx_class_sessions_routine_id").on(table.routineId),
  index("idx_class_sessions_sec_date").on(table.section, table.sessionDate),
  unique("unq_class_session_slot").on(
    table.subjectId,
    table.sessionDate,
    table.section,
    table.startTime
  ),
]);

export const lectureLogs = sqliteTable("lecture_logs", {
  id: text("id").primaryKey(),
  classSessionId: text("class_session_id")
    .notNull()
    .unique()
    .references(() => classSessions.id, { onDelete: "cascade" }),
  topicsCovered: text("topics_covered").notNull(),
  homework: text("homework").notNull(),
  notes: text("notes").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const homework = sqliteTable("homework", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  assignedDate: integer("assigned_date", { mode: "timestamp" }).notNull(),
  dueDate: integer("due_date", { mode: "timestamp" }).notNull(),
  sessionId: text("session_id")
    .references(() => classSessions.id, { onDelete: "set null" }),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_homework_status_due").on(table.status, table.dueDate),
  index("idx_homework_subject").on(table.subjectId),
  index("idx_homework_session").on(table.sessionId),
  check("chk_homework_status", sql`${table.status} IN ('active', 'completed', 'archived')`),
]);

export const notices = sqliteTable("notices", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
  attachments: text("attachments", { mode: "json" }).$type<string[]>(),
  createdById: text("created_by_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_notices_pinned_created").on(table.isPinned, table.createdAt),
  index("idx_notices_expires_at").on(table.expiresAt),
  index("idx_notices_created_by").on(table.createdById),
]);

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  eventDate: integer("event_date", { mode: "timestamp" }).notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  eventType: text("event_type").notNull(),
  location: text("location"),
  createdById: text("created_by_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_events_date_time").on(table.eventDate, table.startTime),
  index("idx_events_type_date").on(table.eventType, table.eventDate),
  index("idx_events_created_by").on(table.createdById),
  check("chk_events_time", sql`(${table.startTime} IS NULL AND ${table.endTime} IS NULL) OR (${table.startTime} IS NOT NULL AND ${table.endTime} IS NOT NULL AND ${table.endTime} > ${table.startTime})`),
]);

// --- Course Content Hierarchy ---

export const courseUnits = sqliteTable("course_units", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_course_units_subject_order").on(table.subjectId, table.order),
]);

export const courseChapters = sqliteTable("course_chapters", {
  id: text("id").primaryKey(),
  unitId: text("unit_id")
    .notNull()
    .references(() => courseUnits.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull().default(0),
  coveredAt: integer("covered_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_course_chapters_unit_order").on(table.unitId, table.order),
]);

// --- Milestone 1: 10 New Tables ---

// 1. Users (Auth identity & credentials)
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

// 2. Enrollments (Student-Subject mapping)
export const enrollments = sqliteTable("enrollments", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "restrict" }),
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

// 4. Assignment Submissions (Student work on Homework)
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
  index("idx_assignment_submissions_graded_by").on(table.gradedBy),
  check("chk_assignment_submissions_status", sql`${table.status} IN ('draft', 'submitted', 'graded', 'late')`),
  check("chk_assignment_submissions_score", sql`${table.score} IS NULL OR ${table.score} >= 0`),
]);

// 5. Exams (Internal assessments & unit tests)
export const exams = sqliteTable("exams", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "restrict" }),
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

// 6. Exam Results (Student marks per exam)
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

export const resources = sqliteTable("resources", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  unitId: text("unit_id")
    .references(() => courseUnits.id, { onDelete: "set null" }),
  chapterId: text("chapter_id")
    .references(() => courseChapters.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // 'pdf' | 'slides' | 'link' | 'zip' | 'code' | 'doc'
  fileSize: integer("file_size"),
  uploadedBy: text("uploaded_by")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_resources_subject").on(table.subjectId),
  index("idx_resources_unit").on(table.unitId),
  index("idx_resources_chapter").on(table.chapterId),
  index("idx_resources_uploaded_by").on(table.uploadedBy),
]);

// 8. Study Tasks (Personal student to-do tracker)
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
  index("idx_study_tasks_subject").on(table.subjectId),
  check("chk_study_tasks_status", sql`${table.status} IN ('pending', 'in_progress', 'completed')`),
  check("chk_study_tasks_priority", sql`${table.priority} IN ('low', 'medium', 'high')`),
]);

// 9. Notifications (In-app alerts)
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'system' | 'assignment' | 'attendance' | 'resource' | 'notice' | 'event' | 'exam' | 'correction_request'
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
  check("chk_notifications_type", sql`${table.type} IN ('system', 'assignment', 'attendance', 'resource', 'notice', 'event', 'exam', 'correction_request')`),
]);

// 10. Attendance Correction Requests (Dispute resolution)
export const attendanceCorrectionRequests = sqliteTable("attendance_correction_requests", {
  id: text("id").primaryKey(),
  attendanceId: text("attendance_id")
    .notNull()
    .references(() => dailyAttendance.id, { onDelete: "cascade" }),
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
  index("idx_attendance_correction_status_created").on(table.status, table.createdAt),
  index("idx_attendance_correction_reviewed_by").on(table.reviewedBy),
  check("chk_attendance_correction_requested_status", sql`${table.requestedStatus} IN ('present', 'excused')`),
  check("chk_attendance_correction_status", sql`${table.status} IN ('pending', 'approved', 'rejected')`),
]);

// 11. Sessions (Server-side session registry enabling revocation)
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // SHA-256 digest of the signed session token
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_sessions_user_id").on(table.userId),
]);

// 12. Files — UploadThing file graph (versioned, dedup via checksum)
export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  utKey: text("ut_key").notNull().unique(), // UploadThing key
  url: text("url").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  checksum: text("checksum"),
  courseId: text("course_id").references(() => subjects.id, { onDelete: "set null" }),
  chapterId: text("chapter_id").references(() => courseChapters.id, { onDelete: "set null" }),
  submissionId: text("submission_id").references(() => assignmentSubmissions.id, { onDelete: "cascade" }),
  noticeId: text("notice_id").references(() => notices.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  parentFileId: text("parent_file_id").references((): any => files.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_files_checksum").on(table.checksum),
  index("idx_files_course").on(table.courseId),
  index("idx_files_owner").on(table.ownerId),
  index("idx_files_chapter").on(table.chapterId),
  index("idx_files_submission").on(table.submissionId),
  index("idx_files_notice").on(table.noticeId),
]);

// 13. Subject Grade Weights (weighted gradebook category taxonomy)
export const subjectGradeWeights = sqliteTable("subject_grade_weights", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "restrict" }),
  category: text("category").notNull(), // reuses exams.examType values
  weightPct: integer("weight_pct").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_subject_grade_weights_subject_category").on(table.subjectId, table.category),
  check("chk_subject_grade_weights_category", sql`${table.category} IN ('unit_test', 'midterm', 'pre_board', 'practical', 'final')`),
  check("chk_subject_grade_weights_weight", sql`${table.weightPct} BETWEEN 0 AND 100`),
]);

// --- Drizzle Relations ---

export const teachersRelations = relations(teachers, ({ one, many }) => ({
  user: one(users, {
    fields: [teachers.userId],
    references: [users.id],
  }),
  subjects: many(subjects),
  assignmentSubmissionsGraded: many(assignmentSubmissions),
  resources: many(resources),
  attendanceCorrectionsReviewed: many(attendanceCorrectionRequests),
  routineSlots: many(weeklyRoutine),
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
  resources: many(resources),
  studyTasks: many(studyTasks),
  subjectGradeWeights: many(subjectGradeWeights),
  exams: many(exams),
}));

export const subjectGradeWeightsRelations = relations(subjectGradeWeights, ({ one }) => ({
  subject: one(subjects, {
    fields: [subjectGradeWeights.subjectId],
    references: [subjects.id],
  }),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  dailyAttendance: many(dailyAttendance),
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
  teacher: one(teachers, {
    fields: [weeklyRoutine.teacherId],
    references: [teachers.id],
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
  homework: many(homework),
}));

export const lectureLogsRelations = relations(lectureLogs, ({ one }) => ({
  classSession: one(classSessions, {
    fields: [lectureLogs.classSessionId],
    references: [classSessions.id],
  }),
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
  resources: many(resources),
}));

export const courseChaptersRelations = relations(courseChapters, ({ one, many }) => ({
  unit: one(courseUnits, {
    fields: [courseChapters.unitId],
    references: [courseUnits.id],
  }),
  resources: many(resources),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  student: one(students, {
    fields: [users.id],
    references: [students.userId],
  }),
  teacher: one(teachers, {
    fields: [users.id],
    references: [teachers.userId],
  }),
  notifications: many(notifications),
  sessions: many(sessions),
  markedDailySessions: many(dailySessions),
  broadcastLogs: many(telegramBroadcastLogs),
  createdNotices: many(notices),
  createdEvents: many(events),
  uploadedResources: many(resources),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
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
  unit: one(courseUnits, {
    fields: [resources.unitId],
    references: [courseUnits.id],
  }),
  chapter: one(courseChapters, {
    fields: [resources.chapterId],
    references: [courseChapters.id],
  }),
  uploadedByUser: one(users, {
    fields: [resources.uploadedBy],
    references: [users.id],
  }),
}));

export const noticesRelations = relations(notices, ({ one }) => ({
  createdBy: one(users, {
    fields: [notices.createdById],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  createdBy: one(users, {
    fields: [events.createdById],
    references: [users.id],
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
  attendance: one(dailyAttendance, {
    fields: [attendanceCorrectionRequests.attendanceId],
    references: [dailyAttendance.id],
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

export const filesRelations = relations(files, ({ one }) => ({
  owner: one(users, {
    fields: [files.ownerId],
    references: [users.id],
  }),
  course: one(subjects, {
    fields: [files.courseId],
    references: [subjects.id],
  }),
  chapter: one(courseChapters, {
    fields: [files.chapterId],
    references: [courseChapters.id],
  }),
  submission: one(assignmentSubmissions, {
    fields: [files.submissionId],
    references: [assignmentSubmissions.id],
  }),
  notice: one(notices, {
    fields: [files.noticeId],
    references: [notices.id],
  }),
  parentFile: one(files, {
    fields: [files.parentFileId],
    references: [files.id],
  }),
}));

// --- TypeScript Inferred Types & Enums ---

export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

export type WeeklyRoutine = typeof weeklyRoutine.$inferSelect;
export type NewWeeklyRoutine = typeof weeklyRoutine.$inferInsert;
export type RoutineSlotType = "LECTURE" | "LAB" | "BREAK" | "ECA" | "LIBRARY";

export type ClassSession = typeof classSessions.$inferSelect;
export type NewClassSession = typeof classSessions.$inferInsert;

export type LectureLog = typeof lectureLogs.$inferSelect;
export type NewLectureLog = typeof lectureLogs.$inferInsert;

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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = "ADMIN" | "TEACHER" | "CR" | "STUDENT";

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

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

export type FileRecord = typeof files.$inferSelect;
export type NewFileRecord = typeof files.$inferInsert;

export type SubjectGradeWeight = typeof subjectGradeWeights.$inferSelect;
export type NewSubjectGradeWeight = typeof subjectGradeWeights.$inferInsert;

export const dailySessions = sqliteTable("daily_sessions", {
  id: text("id").primaryKey(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  semester: integer("semester").notNull().default(1),
  section: text("section").notNull().default("A"),
  markedBy: text("marked_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_daily_session_date_sem_sec").on(table.date, table.semester, table.section),
  index("idx_daily_sessions_semester_date").on(table.semester, table.date),
  index("idx_daily_sessions_marked_by").on(table.markedBy),
  check("chk_daily_sessions_semester", sql`${table.semester} BETWEEN 1 AND 8`),
]);

export const dailyAttendance = sqliteTable("daily_attendance", {
  id: text("id").primaryKey(),
  dailySessionId: text("daily_session_id").notNull().references(() => dailySessions.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_daily_attendance_session_student").on(table.dailySessionId, table.studentId),
  index("idx_daily_attendance_student_id").on(table.studentId),
  index("idx_daily_attendance_student_status").on(table.studentId, table.status),
  check("chk_daily_attendance_status", sql`${table.status} IN ('present', 'absent', 'late', 'excused')`),
]);

export const dailySessionsRelations = relations(dailySessions, ({ many, one }) => ({
  attendance: many(dailyAttendance),
  marker: one(users, {
    fields: [dailySessions.markedBy],
    references: [users.id],
  }),
}));

export const dailyAttendanceRelations = relations(dailyAttendance, ({ one, many }) => ({
  dailySession: one(dailySessions, {
    fields: [dailyAttendance.dailySessionId],
    references: [dailySessions.id],
  }),
  student: one(students, {
    fields: [dailyAttendance.studentId],
    references: [students.id],
  }),
  correctionRequests: many(attendanceCorrectionRequests),
}));

// --- 14. Telegram Bot Integration & Semester Routing ---

export const telegramSettings = sqliteTable("telegram_settings", {
  id: text("id").primaryKey(),
  botToken: text("bot_token").notNull(),
  botUsername: text("bot_username"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  morningBriefTime: text("morning_brief_time").notNull().default("05:30"),
  eveningBriefTime: text("evening_brief_time").notNull().default("20:00"),
  weekendDays: text("weekend_days", { mode: "json" }).$type<number[]>().notNull().default(sql`'[0, 6]'`), // 0: Sunday, 6: Saturday
  cronSecret: text("cron_secret").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const semesterTelegramConfigs = sqliteTable("semester_telegram_configs", {
  id: text("id").primaryKey(),
  semester: integer("semester").notNull().default(1),
  section: text("section").notNull().default("A"),
  chatId: text("chat_id").notNull(),
  messageThreadId: integer("message_thread_id"), // Optional forum topic thread ID
  chatTitle: text("chat_title"),
  autoMorningBrief: integer("auto_morning_brief", { mode: "boolean" }).notNull().default(true),
  autoEveningBrief: integer("auto_evening_brief", { mode: "boolean" }).notNull().default(true),
  autoNotices: integer("auto_notices", { mode: "boolean" }).notNull().default(true),
  lastRoutineModifiedAt: integer("last_routine_modified_at", { mode: "timestamp" }),
  lastRoutinePublishedAt: integer("last_routine_published_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_semester_telegram_configs_sem_sec").on(table.semester, table.section),
  check("chk_semester_telegram_configs_semester", sql`${table.semester} BETWEEN 1 AND 8`),
]);

export const telegramBroadcastLogs = sqliteTable("telegram_broadcast_logs", {
  id: text("id").primaryKey(),
  semester: integer("semester").notNull().default(1),
  type: text("type").notNull(), // 'routine_broadcast' | 'notice_broadcast' | 'morning_brief' | 'evening_brief' | 'test_message'
  date: text("date"), // ISO date string "YYYY-MM-DD" for daily briefs, null for ad-hoc broadcasts
  messageText: text("message_text").notNull(),
  status: text("status").notNull(), // 'pending' | 'success' | 'failed'
  errorMessage: text("error_message"),
  sentByUserId: text("sent_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_telegram_broadcast_logs_created").on(table.createdAt),
  index("idx_telegram_broadcast_logs_semester").on(table.semester),
  index("idx_telegram_broadcast_logs_sent_by").on(table.sentByUserId),
  uniqueIndex("idx_telegram_broadcast_logs_dedup").on(table.semester, table.type, table.date),
  check("chk_telegram_broadcast_logs_semester", sql`${table.semester} BETWEEN 1 AND 8`),
]);

export const telegramBroadcastLogsRelations = relations(telegramBroadcastLogs, ({ one }) => ({
  sender: one(users, {
    fields: [telegramBroadcastLogs.sentByUserId],
    references: [users.id],
  }),
}));

export type TelegramSettings = typeof telegramSettings.$inferSelect;
export type NewTelegramSettings = typeof telegramSettings.$inferInsert;

export type SemesterTelegramConfig = typeof semesterTelegramConfigs.$inferSelect;
export type NewSemesterTelegramConfig = typeof semesterTelegramConfigs.$inferInsert;

export type TelegramBroadcastLog = typeof telegramBroadcastLogs.$inferSelect;
export type NewTelegramBroadcastLog = typeof telegramBroadcastLogs.$inferInsert;

