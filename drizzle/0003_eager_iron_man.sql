ALTER TABLE `students` ADD `email` text;--> statement-breakpoint
ALTER TABLE `students` ADD `phone` text;--> statement-breakpoint
CREATE UNIQUE INDEX `students_email_unique` ON `students` (`email`);