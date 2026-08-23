CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`ut_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`checksum` text NOT NULL,
	`course_id` text,
	`chapter_id` text,
	`submission_id` text,
	`notice_id` text,
	`version` integer DEFAULT 1 NOT NULL,
	`parent_file_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`chapter_id`) REFERENCES `course_chapters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`submission_id`) REFERENCES `assignment_submissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_file_id`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE UNIQUE INDEX `files_ut_key_unique` ON `files` (`ut_key`);--> statement-breakpoint
CREATE INDEX `idx_files_checksum` ON `files` (`checksum`);--> statement-breakpoint
CREATE INDEX `idx_files_course` ON `files` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_files_owner` ON `files` (`owner_id`);--> statement-breakpoint
ALTER TABLE `notices` ADD `attachments` text;--> statement-breakpoint
CREATE INDEX `idx_resources_chapter_created` ON `resources` (`chapter_id`,`created_at`);
