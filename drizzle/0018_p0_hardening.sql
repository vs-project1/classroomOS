ALTER TABLE `weekly_routine` ADD COLUMN `semester` text DEFAULT 'I' NOT NULL;--> statement-breakpoint
UPDATE `weekly_routine` SET `semester` = COALESCE((SELECT `semester` FROM `subjects` WHERE `subjects`.`id` = `weekly_routine`.`subject_id`), 'I') WHERE `subject_id` IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_weekly_routine_semester` ON `weekly_routine` (`semester`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_weekly_routine_sem_sec` ON `weekly_routine` (`semester`, `section`);--> statement-breakpoint
ALTER TABLE `class_sessions` ADD COLUMN `section` text DEFAULT 'A' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_class_sessions_sec_date` ON `class_sessions` (`section`, `session_date`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `unq_class_session_slot` ON `class_sessions` (`subject_id`, `session_date`, `section`, `start_time`);--> statement-breakpoint
DROP INDEX IF EXISTS `unq_class_session_subject_date`;