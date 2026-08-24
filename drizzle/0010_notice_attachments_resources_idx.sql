ALTER TABLE `notices` ADD `attachments` text;--> statement-breakpoint
CREATE INDEX `idx_resources_chapter_created` ON `resources` (`chapter_id`,`created_at`);
