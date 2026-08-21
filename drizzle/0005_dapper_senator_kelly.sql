CREATE TABLE `assignment_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`homework_id` text NOT NULL,
	`student_id` text NOT NULL,
	`content` text,
	`file_url` text,
	`file_name` text,
	`file_size` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`submitted_at` integer,
	`grade` text,
	`score` integer,
	`feedback` text,
	`graded_by` text,
	`graded_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`homework_id`) REFERENCES `homework`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`graded_by`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_assignment_submissions_status" CHECK("assignment_submissions"."status" IN ('draft', 'submitted', 'graded', 'late')),
	CONSTRAINT "chk_assignment_submissions_score" CHECK("assignment_submissions"."score" IS NULL OR "assignment_submissions"."score" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_assignment_submissions_student` ON `assignment_submissions` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_assignment_submissions_homework` ON `assignment_submissions` (`homework_id`);--> statement-breakpoint
CREATE INDEX `idx_assignment_submissions_status` ON `assignment_submissions` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_assignment_submissions_homework_student` ON `assignment_submissions` (`homework_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `attendance_correction_requests` (
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
	FOREIGN KEY (`attendance_id`) REFERENCES `attendance`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_attendance_correction_requested_status" CHECK("attendance_correction_requests"."requested_status" IN ('present', 'excused')),
	CONSTRAINT "chk_attendance_correction_status" CHECK("attendance_correction_requests"."status" IN ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX `idx_attendance_correction_student` ON `attendance_correction_requests` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_correction_attendance` ON `attendance_correction_requests` (`attendance_id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_correction_status` ON `attendance_correction_requests` (`status`);--> statement-breakpoint
CREATE TABLE `course_chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`unit_id` text NOT NULL,
	`title` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `course_units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_course_chapters_unit_order` ON `course_chapters` (`unit_id`,`order`);--> statement-breakpoint
CREATE TABLE `course_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`chapter_id` text NOT NULL,
	`title` text NOT NULL,
	`file_url` text NOT NULL,
	`file_type` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `course_chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `course_units` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`title` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_course_units_subject_order` ON `course_units` (`subject_id`,`order`);--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`semester` integer NOT NULL,
	`enrolled_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_enrollments_semester" CHECK("enrollments"."semester" BETWEEN 1 AND 8)
);
--> statement-breakpoint
CREATE INDEX `idx_enrollments_student_id` ON `enrollments` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_enrollments_subject_id` ON `enrollments` (`subject_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_enrollments_student_subject` ON `enrollments` (`student_id`,`subject_id`);--> statement-breakpoint
CREATE TABLE `exam_results` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`student_id` text NOT NULL,
	`obtained_marks` integer,
	`is_absent` integer DEFAULT false NOT NULL,
	`remarks` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_exam_results_marks" CHECK("exam_results"."obtained_marks" IS NULL OR "exam_results"."obtained_marks" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_exam_results_student` ON `exam_results` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_exam_results_exam` ON `exam_results` (`exam_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_exam_results_exam_student` ON `exam_results` (`exam_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `exams` (
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
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_exams_type" CHECK("exams"."exam_type" IN ('unit_test', 'midterm', 'pre_board', 'practical', 'final')),
	CONSTRAINT "chk_exams_marks" CHECK("exams"."total_marks" > 0 AND "exams"."pass_marks" >= 0 AND "exams"."pass_marks" <= "exams"."total_marks"),
	CONSTRAINT "chk_exams_time" CHECK(("exams"."start_time" IS NULL AND "exams"."end_time" IS NULL) OR ("exams"."start_time" IS NOT NULL AND "exams"."end_time" IS NOT NULL AND "exams"."end_time" > "exams"."start_time"))
);
--> statement-breakpoint
CREATE INDEX `idx_exams_subject_date` ON `exams` (`subject_id`,`exam_date`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text NOT NULL,
	`link` text,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_notifications_type" CHECK("notifications"."type" IN ('system', 'assignment', 'attendance', 'notice', 'exam', 'correction_request'))
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user_unread` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_created` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `resources` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`chapter_id` text,
	`title` text NOT NULL,
	`description` text,
	`file_url` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer,
	`uploaded_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `course_chapters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`uploaded_by`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_resources_subject` ON `resources` (`subject_id`);--> statement-breakpoint
CREATE INDEX `idx_resources_chapter` ON `resources` (`chapter_id`);--> statement-breakpoint
CREATE INDEX `idx_resources_uploaded_by` ON `resources` (`uploaded_by`);--> statement-breakpoint
CREATE TABLE `student_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`roll_number` text NOT NULL,
	`faculty` text NOT NULL,
	`semester` integer NOT NULL,
	`section` text NOT NULL,
	`batch_year` integer NOT NULL,
	`phone` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_student_profiles_semester" CHECK("student_profiles"."semester" BETWEEN 1 AND 8)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_profiles_roll_number_unique` ON `student_profiles` (`roll_number`);--> statement-breakpoint
CREATE INDEX `idx_student_profiles_faculty_semester` ON `student_profiles` (`faculty`,`semester`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_student_profiles_user_id` ON `student_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `study_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`subject_id` text,
	`title` text NOT NULL,
	`description` text,
	`due_date` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_study_tasks_status" CHECK("study_tasks"."status" IN ('pending', 'in_progress', 'completed')),
	CONSTRAINT "chk_study_tasks_priority" CHECK("study_tasks"."priority" IN ('low', 'medium', 'high'))
);
--> statement-breakpoint
CREATE INDEX `idx_study_tasks_student_status` ON `study_tasks` (`student_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_study_tasks_student_due` ON `study_tasks` (`student_id`,`due_date`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`must_change_password` integer DEFAULT true NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "chk_users_role" CHECK("users"."role" IN ('ADMIN', 'TEACHER', 'CR', 'STUDENT'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);