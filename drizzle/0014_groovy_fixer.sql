CREATE TABLE `semester_telegram_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`semester` text NOT NULL,
	`chat_id` text NOT NULL,
	`message_thread_id` integer,
	`chat_title` text,
	`auto_morning_brief` integer DEFAULT true NOT NULL,
	`auto_evening_brief` integer DEFAULT true NOT NULL,
	`auto_notices` integer DEFAULT true NOT NULL,
	`last_routine_modified_at` integer,
	`last_routine_published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `semester_telegram_configs_semester_unique` ON `semester_telegram_configs` (`semester`);--> statement-breakpoint
CREATE TABLE `telegram_broadcast_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`semester` text NOT NULL,
	`type` text NOT NULL,
	`message_text` text NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`sent_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`sent_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_telegram_broadcast_logs_created` ON `telegram_broadcast_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_telegram_broadcast_logs_semester` ON `telegram_broadcast_logs` (`semester`);--> statement-breakpoint
CREATE TABLE `telegram_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_token` text NOT NULL,
	`bot_username` text,
	`is_enabled` integer DEFAULT true NOT NULL,
	`morning_brief_time` text DEFAULT '05:30' NOT NULL,
	`evening_brief_time` text DEFAULT '20:00' NOT NULL,
	`weekend_days` text DEFAULT '[0, 6]' NOT NULL,
	`cron_secret` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `students` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `teachers` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_daily_attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`daily_session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`daily_session_id`) REFERENCES `daily_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_daily_attendance_status" CHECK("__new_daily_attendance"."status" IN ('present', 'absent', 'late', 'excused'))
);
--> statement-breakpoint
INSERT INTO `__new_daily_attendance`("id", "daily_session_id", "student_id", "status", "created_at") SELECT "id", "daily_session_id", "student_id", "status", "created_at" FROM `daily_attendance`;--> statement-breakpoint
DROP TABLE `daily_attendance`;--> statement-breakpoint
ALTER TABLE `__new_daily_attendance` RENAME TO `daily_attendance`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `unq_daily_attendance_session_student` ON `daily_attendance` (`daily_session_id`,`student_id`);