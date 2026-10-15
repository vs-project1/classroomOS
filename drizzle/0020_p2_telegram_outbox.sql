CREATE TABLE `telegram_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`message_thread_id` integer,
	`text` text NOT NULL,
	`pin_message` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`max_retries` integer DEFAULT 5 NOT NULL,
	`next_attempt_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_error` text,
	`metadata` text,
	`processed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "chk_telegram_outbox_status" CHECK("telegram_outbox"."status" IN ('pending', 'processing', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE INDEX `idx_telegram_outbox_queue` ON `telegram_outbox` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `idx_telegram_outbox_chat` ON `telegram_outbox` (`chat_id`);
