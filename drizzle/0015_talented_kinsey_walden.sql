PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_attendance_correction_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`attendance_id` text NOT NULL,
	`student_id` text NOT NULL,
	`requested_status` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`review_note` text,
	`reviewed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`attendance_id`) REFERENCES `daily_attendance`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_attendance_correction_requested_status" CHECK("__new_attendance_correction_requests"."requested_status" IN ('present', 'excused')),
	CONSTRAINT "chk_attendance_correction_status" CHECK("__new_attendance_correction_requests"."status" IN ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
INSERT INTO `__new_attendance_correction_requests`("id", "attendance_id", "student_id", "requested_status", "reason", "status", "reviewed_by", "review_note", "reviewed_at", "created_at", "updated_at") SELECT "id", "attendance_id", "student_id", "requested_status", "reason", "status", "reviewed_by", "review_note", "reviewed_at", "created_at", "updated_at" FROM `attendance_correction_requests`;--> statement-breakpoint
DROP TABLE `attendance_correction_requests`;--> statement-breakpoint
ALTER TABLE `__new_attendance_correction_requests` RENAME TO `attendance_correction_requests`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_attendance_correction_student` ON `attendance_correction_requests` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_correction_attendance` ON `attendance_correction_requests` (`attendance_id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_correction_status` ON `attendance_correction_requests` (`status`);--> statement-breakpoint
ALTER TABLE `resources` ADD `unit_id` text REFERENCES course_units(id);--> statement-breakpoint
CREATE INDEX `idx_resources_unit` ON `resources` (`unit_id`);