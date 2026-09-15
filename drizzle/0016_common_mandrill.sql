ALTER TABLE `telegram_broadcast_logs` ADD `date` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_telegram_broadcast_logs_dedup` ON `telegram_broadcast_logs` (`semester`,`type`,`date`);