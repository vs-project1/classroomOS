CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`event_date` integer NOT NULL,
	`start_time` text,
	`end_time` text,
	`event_type` text NOT NULL,
	`location` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "chk_events_time" CHECK(("events"."start_time" IS NULL AND "events"."end_time" IS NULL) OR ("events"."start_time" IS NOT NULL AND "events"."end_time" IS NOT NULL AND "events"."end_time" > "events"."start_time"))
);
--> statement-breakpoint
CREATE INDEX `idx_events_date_time` ON `events` (`event_date`,`start_time`);--> statement-breakpoint
CREATE TABLE `homework` (
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
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `class_sessions`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_homework_status" CHECK("homework"."status" IN ('active', 'completed', 'archived'))
);
--> statement-breakpoint
CREATE INDEX `idx_homework_status_due` ON `homework` (`status`,`due_date`);--> statement-breakpoint
CREATE INDEX `idx_homework_subject` ON `homework` (`subject_id`);--> statement-breakpoint
CREATE INDEX `idx_homework_session` ON `homework` (`session_id`);--> statement-breakpoint
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`expires_at` integer,
	`is_pinned` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notices_pinned_created` ON `notices` (`is_pinned`,`created_at`);--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_email_unique` ON `teachers` (`email`);--> statement-breakpoint
CREATE TABLE `weekly_routine` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`teacher_name` text,
	`room` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_weekly_routine_day" CHECK("weekly_routine"."day_of_week" BETWEEN 0 AND 6),
	CONSTRAINT "chk_weekly_routine_time" CHECK("weekly_routine"."start_time" < "weekly_routine"."end_time")
);
--> statement-breakpoint
CREATE INDEX `idx_weekly_routine_day_time` ON `weekly_routine` (`day_of_week`,`start_time`);--> statement-breakpoint
CREATE INDEX `idx_weekly_routine_subject` ON `weekly_routine` (`subject_id`);--> statement-breakpoint
DROP INDEX "idx_attendance_student_id";--> statement-breakpoint
DROP INDEX "unq_attendance_session_student";--> statement-breakpoint
DROP INDEX "idx_class_sessions_subject_id";--> statement-breakpoint
DROP INDEX "idx_class_sessions_session_date";--> statement-breakpoint
DROP INDEX "idx_events_date_time";--> statement-breakpoint
DROP INDEX "idx_homework_status_due";--> statement-breakpoint
DROP INDEX "idx_homework_subject";--> statement-breakpoint
DROP INDEX "idx_homework_session";--> statement-breakpoint
DROP INDEX "lecture_logs_class_session_id_unique";--> statement-breakpoint
DROP INDEX "idx_notices_pinned_created";--> statement-breakpoint
DROP INDEX "students_roll_number_unique";--> statement-breakpoint
DROP INDEX "subjects_code_unique";--> statement-breakpoint
DROP INDEX "teachers_email_unique";--> statement-breakpoint
DROP INDEX "idx_weekly_routine_day_time";--> statement-breakpoint
DROP INDEX "idx_weekly_routine_subject";--> statement-breakpoint
ALTER TABLE `lecture_logs` ALTER COLUMN "homework" TO "homework" text NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_attendance_student_id` ON `attendance` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_attendance_session_student` ON `attendance` (`class_session_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `idx_class_sessions_subject_id` ON `class_sessions` (`subject_id`);--> statement-breakpoint
CREATE INDEX `idx_class_sessions_session_date` ON `class_sessions` (`session_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `lecture_logs_class_session_id_unique` ON `lecture_logs` (`class_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `students_roll_number_unique` ON `students` (`roll_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_code_unique` ON `subjects` (`code`);--> statement-breakpoint
ALTER TABLE `lecture_logs` ALTER COLUMN "notes" TO "notes" text NOT NULL;--> statement-breakpoint
ALTER TABLE `class_sessions` ADD `routine_id` text REFERENCES weekly_routine(id);--> statement-breakpoint
ALTER TABLE `class_sessions` ADD `start_time` text NOT NULL;--> statement-breakpoint
ALTER TABLE `class_sessions` ADD `end_time` text NOT NULL;--> statement-breakpoint
ALTER TABLE `subjects` ADD `teacher_id` text REFERENCES teachers(id);