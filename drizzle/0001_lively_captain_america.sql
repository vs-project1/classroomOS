CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`class_session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`class_session_id`) REFERENCES `class_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_attendance_status" CHECK("attendance"."status" IN ('present', 'absent', 'late', 'excused'))
);
--> statement-breakpoint
CREATE INDEX `idx_attendance_student_id` ON `attendance` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_attendance_session_student` ON `attendance` (`class_session_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `class_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`session_date` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_class_sessions_subject_id` ON `class_sessions` (`subject_id`);--> statement-breakpoint
CREATE INDEX `idx_class_sessions_session_date` ON `class_sessions` (`session_date`);--> statement-breakpoint
CREATE TABLE `lecture_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`class_session_id` text NOT NULL,
	`topics_covered` text NOT NULL,
	`homework` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`class_session_id`) REFERENCES `class_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lecture_logs_class_session_id_unique` ON `lecture_logs` (`class_session_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`roll_number` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_roll_number_unique` ON `students` (`roll_number`);