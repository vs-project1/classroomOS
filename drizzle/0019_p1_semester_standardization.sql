DROP TABLE IF EXISTS `__new_class_sessions`;--> statement-breakpoint
DROP TABLE IF EXISTS `__new_course_units`;--> statement-breakpoint
DROP TABLE IF EXISTS `__new_enrollments`;--> statement-breakpoint
DROP TABLE IF EXISTS `__new_exams`;--> statement-breakpoint
DROP TABLE IF EXISTS `__new_homework`;--> statement-breakpoint
DROP TABLE IF EXISTS `__new_subject_grade_weights`;--> statement-breakpoint
DROP TABLE IF EXISTS `__new_weekly_routine`;--> statement-breakpoint
DROP TABLE IF EXISTS `__new_daily_sessions`;--> statement-breakpoint
DROP TABLE IF EXISTS `__new_semester_telegram_configs`;--> statement-breakpoint
DROP TABLE IF EXISTS `__new_subjects`;--> statement-breakpoint
DROP TABLE IF EXISTS `__new_telegram_broadcast_logs`;--> statement-breakpoint
UPDATE `subjects` SET `semester` = CASE
  WHEN `semester` IN ('I', '1st', '1st Semester') THEN 1
  WHEN `semester` IN ('II', '2nd', '2nd Semester') THEN 2
  WHEN `semester` IN ('III', '3rd', '3rd Semester') THEN 3
  WHEN `semester` IN ('IV', '4th', '4th Semester') THEN 4
  WHEN `semester` IN ('V', '5th', '5th Semester') THEN 5
  WHEN `semester` IN ('VI', '6th', '6th Semester') THEN 6
  WHEN `semester` IN ('VII', '7th', '7th Semester') THEN 7
  WHEN `semester` IN ('VIII', '8th', '8th Semester') THEN 8
  WHEN CAST(`semester` AS INTEGER) BETWEEN 1 AND 8 THEN CAST(`semester` AS INTEGER)
  ELSE 1
END;
--> statement-breakpoint
UPDATE `weekly_routine` SET `semester` = CASE
  WHEN `semester` IN ('I', '1st', '1st Semester') THEN 1
  WHEN `semester` IN ('II', '2nd', '2nd Semester') THEN 2
  WHEN `semester` IN ('III', '3rd', '3rd Semester') THEN 3
  WHEN `semester` IN ('IV', '4th', '4th Semester') THEN 4
  WHEN `semester` IN ('V', '5th', '5th Semester') THEN 5
  WHEN `semester` IN ('VI', '6th', '6th Semester') THEN 6
  WHEN `semester` IN ('VII', '7th', '7th Semester') THEN 7
  WHEN `semester` IN ('VIII', '8th', '8th Semester') THEN 8
  WHEN CAST(`semester` AS INTEGER) BETWEEN 1 AND 8 THEN CAST(`semester` AS INTEGER)
  ELSE 1
END;
--> statement-breakpoint
UPDATE `daily_sessions` SET `semester` = CASE
  WHEN `semester` IN ('I', '1st', '1st Semester') THEN 1
  WHEN `semester` IN ('II', '2nd', '2nd Semester') THEN 2
  WHEN `semester` IN ('III', '3rd', '3rd Semester') THEN 3
  WHEN `semester` IN ('IV', '4th', '4th Semester') THEN 4
  WHEN `semester` IN ('V', '5th', '5th Semester') THEN 5
  WHEN `semester` IN ('VI', '6th', '6th Semester') THEN 6
  WHEN `semester` IN ('VII', '7th', '7th Semester') THEN 7
  WHEN `semester` IN ('VIII', '8th', '8th Semester') THEN 8
  WHEN CAST(`semester` AS INTEGER) BETWEEN 1 AND 8 THEN CAST(`semester` AS INTEGER)
  ELSE 1
END;
--> statement-breakpoint
UPDATE `semester_telegram_configs` SET `semester` = CASE
  WHEN `semester` IN ('I', '1st', '1st Semester') THEN 1
  WHEN `semester` IN ('II', '2nd', '2nd Semester') THEN 2
  WHEN `semester` IN ('III', '3rd', '3rd Semester') THEN 3
  WHEN `semester` IN ('IV', '4th', '4th Semester') THEN 4
  WHEN `semester` IN ('V', '5th', '5th Semester') THEN 5
  WHEN `semester` IN ('VI', '6th', '6th Semester') THEN 6
  WHEN `semester` IN ('VII', '7th', '7th Semester') THEN 7
  WHEN `semester` IN ('VIII', '8th', '8th Semester') THEN 8
  WHEN CAST(`semester` AS INTEGER) BETWEEN 1 AND 8 THEN CAST(`semester` AS INTEGER)
  ELSE 1
END;
--> statement-breakpoint
UPDATE `telegram_broadcast_logs` SET `semester` = CASE
  WHEN `semester` IN ('I', '1st', '1st Semester') THEN 1
  WHEN `semester` IN ('II', '2nd', '2nd Semester') THEN 2
  WHEN `semester` IN ('III', '3rd', '3rd Semester') THEN 3
  WHEN `semester` IN ('IV', '4th', '4th Semester') THEN 4
  WHEN `semester` IN ('V', '5th', '5th Semester') THEN 5
  WHEN `semester` IN ('VI', '6th', '6th Semester') THEN 6
  WHEN `semester` IN ('VII', '7th', '7th Semester') THEN 7
  WHEN `semester` IN ('VIII', '8th', '8th Semester') THEN 8
  WHEN CAST(`semester` AS INTEGER) BETWEEN 1 AND 8 THEN CAST(`semester` AS INTEGER)
  ELSE 1
END;
--> statement-breakpoint
DROP TABLE IF EXISTS `attendance`;--> statement-breakpoint
DROP TABLE IF EXISTS `course_materials`;--> statement-breakpoint
DROP TABLE IF EXISTS `student_profiles`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_class_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`routine_id` text,
	`session_date` integer NOT NULL,
	`section` text DEFAULT 'A' NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`routine_id`) REFERENCES `weekly_routine`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_class_sessions`("id", "subject_id", "routine_id", "session_date", "section", "start_time", "end_time", "created_at") SELECT "id", "subject_id", "routine_id", "session_date", "section", "start_time", "end_time", "created_at" FROM `class_sessions`;--> statement-breakpoint
DROP TABLE `class_sessions`;--> statement-breakpoint
ALTER TABLE `__new_class_sessions` RENAME TO `class_sessions`;--> statement-breakpoint
CREATE INDEX `idx_class_sessions_subject_id` ON `class_sessions` (`subject_id`);--> statement-breakpoint
CREATE INDEX `idx_class_sessions_session_date` ON `class_sessions` (`session_date`);--> statement-breakpoint
CREATE INDEX `idx_class_sessions_routine_id` ON `class_sessions` (`routine_id`);--> statement-breakpoint
CREATE INDEX `idx_class_sessions_sec_date` ON `class_sessions` (`section`,`session_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_class_session_slot` ON `class_sessions` (`subject_id`,`session_date`,`section`,`start_time`);--> statement-breakpoint
CREATE TABLE `__new_course_units` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`title` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_course_units`("id", "subject_id", "title", "order", "created_at", "updated_at") SELECT "id", "subject_id", "title", "order", "created_at", "updated_at" FROM `course_units`;--> statement-breakpoint
DROP TABLE `course_units`;--> statement-breakpoint
ALTER TABLE `__new_course_units` RENAME TO `course_units`;--> statement-breakpoint
CREATE INDEX `idx_course_units_subject_order` ON `course_units` (`subject_id`,`order`);--> statement-breakpoint
CREATE TABLE `__new_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`semester` integer NOT NULL,
	`enrolled_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_enrollments_semester" CHECK("__new_enrollments"."semester" BETWEEN 1 AND 8)
);
--> statement-breakpoint
INSERT INTO `__new_enrollments`("id", "student_id", "subject_id", "semester", "enrolled_at") SELECT "id", "student_id", "subject_id", "semester", "enrolled_at" FROM `enrollments`;--> statement-breakpoint
DROP TABLE `enrollments`;--> statement-breakpoint
ALTER TABLE `__new_enrollments` RENAME TO `enrollments`;--> statement-breakpoint
CREATE INDEX `idx_enrollments_student_id` ON `enrollments` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_enrollments_subject_id` ON `enrollments` (`subject_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_enrollments_student_subject` ON `enrollments` (`student_id`,`subject_id`);--> statement-breakpoint
CREATE TABLE `__new_exams` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`title` text NOT NULL,
	`exam_type` text NOT NULL,
	`total_marks` integer NOT NULL,
	`pass_marks` integer NOT NULL,
	`exam_date` integer NOT NULL,
	`start_time` text,
	`end_time` text,
	`room` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_exams_type" CHECK("__new_exams"."exam_type" IN ('unit_test', 'midterm', 'pre_board', 'practical', 'final')),
	CONSTRAINT "chk_exams_marks" CHECK("__new_exams"."total_marks" > 0 AND "__new_exams"."pass_marks" >= 0 AND "__new_exams"."pass_marks" <= "__new_exams"."total_marks"),
	CONSTRAINT "chk_exams_time" CHECK(("__new_exams"."start_time" IS NULL AND "__new_exams"."end_time" IS NULL) OR ("__new_exams"."start_time" IS NOT NULL AND "__new_exams"."end_time" IS NOT NULL AND "__new_exams"."end_time" > "__new_exams"."start_time"))
);
--> statement-breakpoint
INSERT INTO `__new_exams`("id", "subject_id", "title", "exam_type", "total_marks", "pass_marks", "exam_date", "start_time", "end_time", "room", "created_at", "updated_at") SELECT "id", "subject_id", "title", "exam_type", "total_marks", "pass_marks", "exam_date", "start_time", "end_time", "room", "created_at", "updated_at" FROM `exams`;--> statement-breakpoint
DROP TABLE `exams`;--> statement-breakpoint
ALTER TABLE `__new_exams` RENAME TO `exams`;--> statement-breakpoint
CREATE INDEX `idx_exams_subject_date` ON `exams` (`subject_id`,`exam_date`);--> statement-breakpoint
CREATE TABLE `__new_homework` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`assigned_date` integer NOT NULL,
	`due_date` integer NOT NULL,
	`session_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`session_id`) REFERENCES `class_sessions`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_homework_status" CHECK("__new_homework"."status" IN ('active', 'completed', 'archived'))
);
--> statement-breakpoint
INSERT INTO `__new_homework`("id", "subject_id", "title", "description", "assigned_date", "due_date", "session_id", "status", "created_at", "updated_at") SELECT "id", "subject_id", "title", "description", "assigned_date", "due_date", "session_id", "status", "created_at", "updated_at" FROM `homework`;--> statement-breakpoint
DROP TABLE `homework`;--> statement-breakpoint
ALTER TABLE `__new_homework` RENAME TO `homework`;--> statement-breakpoint
CREATE INDEX `idx_homework_status_due` ON `homework` (`status`,`due_date`);--> statement-breakpoint
CREATE INDEX `idx_homework_subject` ON `homework` (`subject_id`);--> statement-breakpoint
CREATE INDEX `idx_homework_session` ON `homework` (`session_id`);--> statement-breakpoint
CREATE TABLE `__new_subject_grade_weights` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`category` text NOT NULL,
	`weight_pct` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_subject_grade_weights_category" CHECK("__new_subject_grade_weights"."category" IN ('unit_test', 'midterm', 'pre_board', 'practical', 'final')),
	CONSTRAINT "chk_subject_grade_weights_weight" CHECK("__new_subject_grade_weights"."weight_pct" BETWEEN 0 AND 100)
);
--> statement-breakpoint
INSERT INTO `__new_subject_grade_weights`("id", "subject_id", "category", "weight_pct", "created_at", "updated_at") SELECT "id", "subject_id", "category", "weight_pct", "created_at", "updated_at" FROM `subject_grade_weights`;--> statement-breakpoint
DROP TABLE `subject_grade_weights`;--> statement-breakpoint
ALTER TABLE `__new_subject_grade_weights` RENAME TO `subject_grade_weights`;--> statement-breakpoint
CREATE UNIQUE INDEX `unq_subject_grade_weights_subject_category` ON `subject_grade_weights` (`subject_id`,`category`);--> statement-breakpoint
CREATE TABLE `__new_weekly_routine` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text,
	`semester` integer DEFAULT 1 NOT NULL,
	`slot_type` text DEFAULT 'LECTURE' NOT NULL,
	`custom_title` text,
	`section` text DEFAULT 'A' NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`teacher_id` text,
	`room` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_weekly_routine_day" CHECK("__new_weekly_routine"."day_of_week" BETWEEN 0 AND 6),
	CONSTRAINT "chk_weekly_routine_time" CHECK("__new_weekly_routine"."start_time" < "__new_weekly_routine"."end_time"),
	CONSTRAINT "chk_weekly_routine_type" CHECK("__new_weekly_routine"."slot_type" IN ('LECTURE', 'LAB', 'BREAK', 'ECA', 'LIBRARY')),
	CONSTRAINT "chk_weekly_routine_semester" CHECK("__new_weekly_routine"."semester" BETWEEN 1 AND 8)
);
--> statement-breakpoint
INSERT INTO `__new_weekly_routine`("id", "subject_id", "semester", "slot_type", "custom_title", "section", "day_of_week", "start_time", "end_time", "teacher_id", "room", "notes", "created_at", "updated_at") SELECT "id", "subject_id", "semester", "slot_type", "custom_title", "section", "day_of_week", "start_time", "end_time", "teacher_id", "room", "notes", "created_at", "updated_at" FROM `weekly_routine`;--> statement-breakpoint
DROP TABLE `weekly_routine`;--> statement-breakpoint
ALTER TABLE `__new_weekly_routine` RENAME TO `weekly_routine`;--> statement-breakpoint
CREATE INDEX `idx_weekly_routine_day_time` ON `weekly_routine` (`day_of_week`,`start_time`);--> statement-breakpoint
CREATE INDEX `idx_weekly_routine_subject` ON `weekly_routine` (`subject_id`);--> statement-breakpoint
CREATE INDEX `idx_weekly_routine_teacher` ON `weekly_routine` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `idx_weekly_routine_section` ON `weekly_routine` (`section`);--> statement-breakpoint
CREATE INDEX `idx_weekly_routine_semester` ON `weekly_routine` (`semester`);--> statement-breakpoint
CREATE INDEX `idx_weekly_routine_sem_sec` ON `weekly_routine` (`semester`,`section`);--> statement-breakpoint
CREATE TABLE `__new_daily_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`date` integer NOT NULL,
	`semester` integer DEFAULT 1 NOT NULL,
	`section` text DEFAULT 'A' NOT NULL,
	`marked_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`marked_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_daily_sessions_semester" CHECK("__new_daily_sessions"."semester" BETWEEN 1 AND 8)
);
--> statement-breakpoint
INSERT INTO `__new_daily_sessions`("id", "date", "semester", "section", "marked_by", "created_at") SELECT "id", "date", "semester", "section", "marked_by", "created_at" FROM `daily_sessions`;--> statement-breakpoint
DROP TABLE `daily_sessions`;--> statement-breakpoint
ALTER TABLE `__new_daily_sessions` RENAME TO `daily_sessions`;--> statement-breakpoint
CREATE INDEX `idx_daily_sessions_semester_date` ON `daily_sessions` (`semester`,`date`);--> statement-breakpoint
CREATE INDEX `idx_daily_sessions_marked_by` ON `daily_sessions` (`marked_by`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_daily_session_date_sem_sec` ON `daily_sessions` (`date`,`semester`,`section`);--> statement-breakpoint
CREATE TABLE `__new_semester_telegram_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`semester` integer DEFAULT 1 NOT NULL,
	`section` text DEFAULT 'A' NOT NULL,
	`chat_id` text NOT NULL,
	`message_thread_id` integer,
	`chat_title` text,
	`auto_morning_brief` integer DEFAULT true NOT NULL,
	`auto_evening_brief` integer DEFAULT true NOT NULL,
	`auto_notices` integer DEFAULT true NOT NULL,
	`last_routine_modified_at` integer,
	`last_routine_published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "chk_semester_telegram_configs_semester" CHECK("__new_semester_telegram_configs"."semester" BETWEEN 1 AND 8)
);
--> statement-breakpoint
INSERT INTO `__new_semester_telegram_configs`("id", "semester", "section", "chat_id", "message_thread_id", "chat_title", "auto_morning_brief", "auto_evening_brief", "auto_notices", "last_routine_modified_at", "last_routine_published_at", "created_at", "updated_at") SELECT "id", "semester", "section", "chat_id", "message_thread_id", "chat_title", "auto_morning_brief", "auto_evening_brief", "auto_notices", "last_routine_modified_at", "last_routine_published_at", "created_at", "updated_at" FROM `semester_telegram_configs`;--> statement-breakpoint
DROP TABLE `semester_telegram_configs`;--> statement-breakpoint
ALTER TABLE `__new_semester_telegram_configs` RENAME TO `semester_telegram_configs`;--> statement-breakpoint
CREATE UNIQUE INDEX `unq_semester_telegram_configs_sem_sec` ON `semester_telegram_configs` (`semester`,`section`);--> statement-breakpoint
CREATE TABLE `__new_subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`code` text NOT NULL,
	`semester` integer DEFAULT 1 NOT NULL,
	`teacher_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_subjects_semester" CHECK("__new_subjects"."semester" BETWEEN 1 AND 8)
);
--> statement-breakpoint
INSERT INTO `__new_subjects`("id", "name", "slug", "code", "semester", "teacher_id", "is_active", "created_at") SELECT "id", "name", "slug", "code", "semester", "teacher_id", 1, "created_at" FROM `subjects`;--> statement-breakpoint
DROP TABLE `subjects`;--> statement-breakpoint
ALTER TABLE `__new_subjects` RENAME TO `subjects`;--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_slug_unique` ON `subjects` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_code_unique` ON `subjects` (`code`);--> statement-breakpoint
CREATE INDEX `idx_subjects_semester` ON `subjects` (`semester`);--> statement-breakpoint
CREATE INDEX `idx_subjects_teacher_id` ON `subjects` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `idx_subjects_is_active` ON `subjects` (`is_active`);--> statement-breakpoint
CREATE TABLE `__new_telegram_broadcast_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`semester` integer DEFAULT 1 NOT NULL,
	`type` text NOT NULL,
	`date` text,
	`message_text` text NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`sent_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`sent_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_telegram_broadcast_logs_semester" CHECK("__new_telegram_broadcast_logs"."semester" BETWEEN 1 AND 8)
);
--> statement-breakpoint
INSERT INTO `__new_telegram_broadcast_logs`("id", "semester", "type", "date", "message_text", "status", "error_message", "sent_by_user_id", "created_at") SELECT "id", "semester", "type", "date", "message_text", "status", "error_message", "sent_by_user_id", "created_at" FROM `telegram_broadcast_logs`;--> statement-breakpoint
DROP TABLE `telegram_broadcast_logs`;--> statement-breakpoint
ALTER TABLE `__new_telegram_broadcast_logs` RENAME TO `telegram_broadcast_logs`;--> statement-breakpoint
CREATE INDEX `idx_telegram_broadcast_logs_created` ON `telegram_broadcast_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_telegram_broadcast_logs_semester` ON `telegram_broadcast_logs` (`semester`);--> statement-breakpoint
CREATE INDEX `idx_telegram_broadcast_logs_sent_by` ON `telegram_broadcast_logs` (`sent_by_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_telegram_broadcast_logs_dedup` ON `telegram_broadcast_logs` (`semester`,`type`,`date`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
