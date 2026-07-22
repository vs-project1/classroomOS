import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer, unique, index, check } from "drizzle-orm/sqlite-core";

// Note on hard deletion: Hard deletion is acceptable for the current prototype.
// A soft deletion strategy may be introduced later if audit trails are required.

export const teachers = sqliteTable("teachers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  phone: text("phone"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  teacherId: text("teacher_id")
    .references(() => teachers.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  rollNumber: text("roll_number").notNull().unique(),
  email: text("email").unique(),
  phone: text("phone"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const weeklyRoutine = sqliteTable("weekly_routine", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  teacherName: text("teacher_name"),
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
  check("chk_weekly_routine_day", sql`${table.dayOfWeek} BETWEEN 0 AND 6`),
  check("chk_weekly_routine_time", sql`${table.startTime} < ${table.endTime}`),
]);

export const classSessions = sqliteTable("class_sessions", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  routineId: text("routine_id")
    .references(() => weeklyRoutine.id, { onDelete: "set null" }),
  sessionDate: integer("session_date", { mode: "timestamp" }).notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_class_sessions_subject_id").on(table.subjectId),
  index("idx_class_sessions_session_date").on(table.sessionDate),
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

export const attendance = sqliteTable("attendance", {
  id: text("id").primaryKey(),
  classSessionId: text("class_session_id")
    .notNull()
    .references(() => classSessions.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_attendance_session_student").on(table.classSessionId, table.studentId),
  index("idx_attendance_student_id").on(table.studentId),
  check("chk_attendance_status", sql`${table.status} IN ('present', 'absent', 'late', 'excused')`)
]);

export const homework = sqliteTable("homework", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
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
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_notices_pinned_created").on(table.isPinned, table.createdAt),
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
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_events_date_time").on(table.eventDate, table.startTime),
  check("chk_events_time", sql`(${table.startTime} IS NULL AND ${table.endTime} IS NULL) OR (${table.startTime} IS NOT NULL AND ${table.endTime} IS NOT NULL AND ${table.endTime} > ${table.startTime})`),
]);

// --- Drizzle Relations ---

export const teachersRelations = relations(teachers, ({ many }) => ({
  subjects: many(subjects),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  classSessions: many(classSessions),
  weeklyRoutine: many(weeklyRoutine),
  homework: many(homework),
  teacher: one(teachers, {
    fields: [subjects.teacherId],
    references: [teachers.id],
  }),
}));

export const studentsRelations = relations(students, ({ many }) => ({
  attendance: many(attendance),
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

export const attendanceRelations = relations(attendance, ({ one }) => ({
  classSession: one(classSessions, {
    fields: [attendance.classSessionId],
    references: [classSessions.id],
  }),
  student: one(students, {
    fields: [attendance.studentId],
    references: [students.id],
  }),
}));

export const homeworkRelations = relations(homework, ({ one }) => ({
  subject: one(subjects, {
    fields: [homework.subjectId],
    references: [subjects.id],
  }),
  session: one(classSessions, {
    fields: [homework.sessionId],
    references: [classSessions.id],
  }),
}));
