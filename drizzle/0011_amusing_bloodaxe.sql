CREATE TABLE `subject_grade_weights` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`category` text NOT NULL,
	`weight_pct` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_subject_grade_weights_category" CHECK("subject_grade_weights"."category" IN ('unit_test', 'midterm', 'pre_board', 'practical', 'final')),
	CONSTRAINT "chk_subject_grade_weights_weight" CHECK("subject_grade_weights"."weight_pct" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE INDEX `idx_subject_grade_weights_subject` ON `subject_grade_weights` (`subject_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_subject_grade_weights_subject_category` ON `subject_grade_weights` (`subject_id`,`category`);--> statement-breakpoint
ALTER TABLE `notices` ADD `attachments` text;--> statement-breakpoint
CREATE INDEX `idx_resources_chapter_created` ON `resources` (`chapter_id`,`created_at`);