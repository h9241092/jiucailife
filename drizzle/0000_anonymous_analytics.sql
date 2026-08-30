CREATE TABLE `anonymous_events` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`event_type` text NOT NULL,
	`game_version` text NOT NULL,
	`game_year` integer,
	`age` integer,
	`season` integer,
	`month` integer,
	`data_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_anonymous_events_run_id` ON `anonymous_events` (`run_id`);--> statement-breakpoint
CREATE INDEX `idx_anonymous_events_type_created_at` ON `anonymous_events` (`event_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `anonymous_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`game_version` text NOT NULL,
	`seed_code` text NOT NULL,
	`trait` text,
	`special_trait` text,
	`initial_cash` integer,
	`initial_health` integer,
	`initial_stress` integer,
	`initial_family` integer,
	`initial_knowledge` integer,
	`initial_credit` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`ending` text,
	`final_age` integer,
	`final_net_worth` integer,
	`early_retirement` integer,
	`achievement_ids` text,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_anonymous_runs_started_at` ON `anonymous_runs` (`started_at`);--> statement-breakpoint
CREATE INDEX `idx_anonymous_runs_status_version` ON `anonymous_runs` (`status`,`game_version`);--> statement-breakpoint
CREATE INDEX `idx_anonymous_runs_seed_code` ON `anonymous_runs` (`seed_code`);