CREATE TABLE `analytics_daily_metrics` (
	`metric_date` text NOT NULL,
	`game_version` text NOT NULL,
	`metric_name` text NOT NULL,
	`dimension` text DEFAULT 'all' NOT NULL,
	`sample_count` integer DEFAULT 0 NOT NULL,
	`value_total` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`metric_date`, `game_version`, `metric_name`, `dimension`)
);
--> statement-breakpoint
CREATE INDEX `idx_analytics_daily_metrics_name_date` ON `analytics_daily_metrics` (`metric_name`,`metric_date`);--> statement-breakpoint
ALTER TABLE `anonymous_events` ADD `schema_version` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `anonymous_events` ADD `event_sequence` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `anonymous_events` ADD `client_elapsed_ms` integer;--> statement-breakpoint
WITH ranked_events AS (
	SELECT `id`, ROW_NUMBER() OVER (PARTITION BY `run_id` ORDER BY `created_at`, `id`) - 1 AS `sequence`
	FROM `anonymous_events`
)
UPDATE `anonymous_events`
SET `event_sequence` = (SELECT `sequence` FROM ranked_events WHERE ranked_events.`id` = anonymous_events.`id`),
	`schema_version` = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_anonymous_events_run_sequence` ON `anonymous_events` (`run_id`,`event_sequence`);--> statement-breakpoint
ALTER TABLE `anonymous_runs` ADD `schema_version` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `anonymous_runs` ADD `event_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `anonymous_runs` ADD `last_event_sequence` integer DEFAULT -1 NOT NULL;--> statement-breakpoint
ALTER TABLE `anonymous_runs` ADD `last_event_type` text;--> statement-breakpoint
ALTER TABLE `anonymous_runs` ADD `last_game_year` integer;--> statement-breakpoint
ALTER TABLE `anonymous_runs` ADD `last_age` integer;--> statement-breakpoint
ALTER TABLE `anonymous_runs` ADD `last_season` integer;--> statement-breakpoint
ALTER TABLE `anonymous_runs` ADD `last_month` integer;--> statement-breakpoint
UPDATE `anonymous_runs`
SET `schema_version` = 1,
	`event_count` = (SELECT COUNT(*) FROM `anonymous_events` WHERE `anonymous_events`.`run_id` = `anonymous_runs`.`id`),
	`last_event_sequence` = COALESCE((SELECT MAX(`event_sequence`) FROM `anonymous_events` WHERE `anonymous_events`.`run_id` = `anonymous_runs`.`id`), -1),
	`last_event_type` = (SELECT `event_type` FROM `anonymous_events` WHERE `anonymous_events`.`run_id` = `anonymous_runs`.`id` ORDER BY `event_sequence` DESC LIMIT 1),
	`last_game_year` = (SELECT `game_year` FROM `anonymous_events` WHERE `anonymous_events`.`run_id` = `anonymous_runs`.`id` ORDER BY `event_sequence` DESC LIMIT 1),
	`last_age` = (SELECT `age` FROM `anonymous_events` WHERE `anonymous_events`.`run_id` = `anonymous_runs`.`id` ORDER BY `event_sequence` DESC LIMIT 1),
	`last_season` = (SELECT `season` FROM `anonymous_events` WHERE `anonymous_events`.`run_id` = `anonymous_runs`.`id` ORDER BY `event_sequence` DESC LIMIT 1),
	`last_month` = (SELECT `month` FROM `anonymous_events` WHERE `anonymous_events`.`run_id` = `anonymous_runs`.`id` ORDER BY `event_sequence` DESC LIMIT 1);
