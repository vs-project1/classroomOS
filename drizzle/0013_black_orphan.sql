CREATE TABLE `daily_attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`daily_session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`daily_session_id`) REFERENCES `daily_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_daily_attendance_session_student` ON `daily_attendance` (`daily_session_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `daily_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`date` integer NOT NULL,
	`semester` text NOT NULL,
	`marked_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`marked_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unq_daily_session_date_sem` ON `daily_sessions` (`date`,`semester`);