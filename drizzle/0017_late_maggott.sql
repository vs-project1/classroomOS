CREATE INDEX `idx_attendance_correction_status_created` ON `attendance_correction_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_class_sessions_routine_id` ON `class_sessions` (`routine_id`);--> statement-breakpoint
CREATE INDEX `idx_course_materials_chapter` ON `course_materials` (`chapter_id`);--> statement-breakpoint
CREATE INDEX `idx_daily_attendance_student_id` ON `daily_attendance` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_daily_attendance_student_status` ON `daily_attendance` (`student_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_daily_sessions_semester_date` ON `daily_sessions` (`semester`,`date`);--> statement-breakpoint
CREATE INDEX `idx_daily_sessions_marked_by` ON `daily_sessions` (`marked_by`);--> statement-breakpoint
CREATE INDEX `idx_students_user_id` ON `students` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_students_semester` ON `students` (`semester`);--> statement-breakpoint
CREATE INDEX `idx_students_faculty_semester` ON `students` (`faculty`,`semester`);--> statement-breakpoint
CREATE INDEX `idx_subjects_semester` ON `subjects` (`semester`);--> statement-breakpoint
CREATE INDEX `idx_subjects_teacher_id` ON `subjects` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `idx_teachers_user_id` ON `teachers` (`user_id`);