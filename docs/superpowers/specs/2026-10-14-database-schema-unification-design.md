# Design Specification: Database Schema Unification & Referential Integrity Overhaul (Council Hardened)

**Specification Date:** 2026-10-14  
**Status:** Approved by Architecture Council  
**Milestone:** M7 — Architectural Schema Unification & Multi-Section Parity  
**Target Roles:** Student, Teacher, CR, Admin  

---

## 1. Executive Summary & Council Findings

This specification synthesizes the findings of the **Classroom OS Architecture Council** (Database Architect, Principal Security Auditor, Academic Domain Auditor, and Migration Resilience Engineer).

### 1.1 Remediation Commitments
1. **Academic History Protection:** Set `students.userId` to `ON DELETE RESTRICT` (not CASCADE) so deleting a user credential never wipes attendance ledgers, submissions, or transcripts.
2. **Multi-Section Scalability:** Add `section: text("section").notNull().default("A")` to `daily_sessions`, `weekly_routine`, and `semester_telegram_configs` with composite unique constraints `(date, semester, section)` to prevent Section B from wiping out Section A.
3. **Non-Teaching Timetable Slots:** Make `weeklyRoutine.subjectId` nullable and introduce `slotType` (`'LECTURE' | 'LAB' | 'BREAK' | 'ECA' | 'LIBRARY'`) and `customTitle` so tiffin breaks, library study, and assembly can be scheduled without dummy syllabus subjects.
4. **Admin-Compatible Resources:** Repoint `resources.uploadedBy` to `users.id` (not `teachers.id`) so Administrators can upload curriculum documents without foreign key constraint crashes.
5. **Session Invalidation on Cutover:** Execute `DELETE FROM sessions;` during migration cutover to cleanly expire active cookies and prevent HTTP 500 crashes in `getCurrentUser()`.
6. **Zero-Data-Loss Migration Protocol:** Table recreation with integer affinity executed with `PRAGMA foreign_keys = OFF` outside transactions, pre/post-flight row count assertions, and `PRAGMA foreign_key_check`.
7. **Formally Retire Legacy `attendance`:** Remove the legacy prototype `attendance` table, standardizing exclusively on `daily_sessions` and `daily_attendance`.

---

## 2. Target Database Schema (`src/db/schema.ts`)

### 2.1 Unified `students` Table
```ts
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
  semester: integer("semester").notNull(), // Canonical integer 1-8
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
```

### 2.2 Relational & Multi-Section `weekly_routine`
```ts
export const weeklyRoutine = sqliteTable("weekly_routine", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .references(() => subjects.id, { onDelete: "cascade" }), // Nullable for non-teaching slots
  slotType: text("slot_type").notNull().default("LECTURE"), // LECTURE | LAB | BREAK | ECA | LIBRARY
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
  check("chk_weekly_routine_day", sql`${table.dayOfWeek} BETWEEN 0 AND 6`),
  check("chk_weekly_routine_time", sql`${table.startTime} < ${table.endTime}`),
  check("chk_weekly_routine_type", sql`${table.slotType} IN ('LECTURE', 'LAB', 'BREAK', 'ECA', 'LIBRARY')`),
]);
```

### 2.3 Multi-Section `daily_sessions` & `daily_attendance`
```ts
export const dailySessions = sqliteTable("daily_sessions", {
  id: text("id").primaryKey(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  semester: text("semester").notNull(),
  section: text("section").notNull().default("A"),
  markedBy: text("marked_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_daily_session_date_sem_sec").on(table.date, table.semester, table.section),
  index("idx_daily_sessions_semester_date").on(table.semester, table.date),
  index("idx_daily_sessions_marked_by").on(table.markedBy),
]);

export const dailyAttendance = sqliteTable("daily_attendance", {
  id: text("id").primaryKey(),
  dailySessionId: text("daily_session_id")
    .notNull()
    .references(() => dailySessions.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_daily_attendance_session_student").on(table.dailySessionId, table.studentId),
  index("idx_daily_attendance_student_id").on(table.studentId),
  index("idx_daily_attendance_student_status").on(table.studentId, table.status),
  check("chk_daily_attendance_status", sql`${table.status} IN ('present', 'absent', 'late', 'excused')`),
]);
```

### 2.4 Multi-Section Telegram Configs
```ts
export const semesterTelegramConfigs = sqliteTable("semester_telegram_configs", {
  id: text("id").primaryKey(),
  semester: text("semester").notNull(),
  section: text("section").notNull().default("A"),
  chatId: text("chat_id").notNull(),
  messageThreadId: integer("message_thread_id"),
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
]);
```

### 2.5 Admin-Compatible `resources`
```ts
export const resources = sqliteTable("resources", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  unitId: text("unit_id")
    .references(() => courseUnits.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id")
    .references(() => courseChapters.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size"),
  uploadedBy: text("uploaded_by")
    .references(() => users.id, { onDelete: "set null" }), // References users.id
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_resources_subject").on(table.subjectId),
  index("idx_resources_chapter").on(table.chapterId),
  index("idx_resources_uploaded_by").on(table.uploadedBy),
]);
```

### 2.6 Author-Tracked `notices` & `events`
```ts
export const notices = sqliteTable("notices", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
  attachments: text("attachments", { mode: "json" }).$type<string[]>(),
  createdById: text("created_by_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
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
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_events_date_time").on(table.eventDate, table.startTime),
  index("idx_events_type_date").on(table.eventType, table.eventDate),
  index("idx_events_created_by").on(table.createdById),
  check("chk_events_time", sql`(${table.startTime} IS NULL AND ${table.endTime} IS NULL) OR (${table.startTime} IS NOT NULL AND ${table.endTime} IS NOT NULL AND ${table.endTime} > ${table.startTime})`),
]);
```

---

## 3. Deprecation & Cleanup Inventory
- Drop `student_profiles` (data backfilled into `students`).
- Drop `course_materials` (chapter materials standardized on `resources`).
- Drop `attendance` (legacy lecture attendance table; canonical single ledger is `daily_attendance`).
