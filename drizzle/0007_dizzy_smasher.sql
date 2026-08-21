ALTER TABLE `course_chapters` ADD `covered_at` integer;--> statement-breakpoint
ALTER TABLE `subjects` ADD `slug` text NOT NULL DEFAULT '';--> statement-breakpoint
UPDATE `subjects` SET `slug` = trim(replace(replace(replace(translate(replace(replace(replace(replace(lower(`name`), ' ', '-'), char(9), '-'), char(10), '-'), char(13), '-'), ' !"#$%&''()*+,.:;<=>?@[]^_`{|}~' || char(92), ''), '--', '-'), '--', '-'), '--', '-'), '-');--> statement-breakpoint
UPDATE `subjects` SET `slug` = `slug` || '-' || CAST(x.rn AS TEXT)
FROM (
  SELECT `id`, ROW_NUMBER() OVER (PARTITION BY `slug` ORDER BY `id`) AS rn
  FROM `subjects`
) AS x
WHERE `subjects`.`id` = x.`id` AND x.`rn` > 1;--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_slug_unique` ON `subjects` (`slug`);
