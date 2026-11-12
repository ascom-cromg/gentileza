CREATE TABLE `google_flows` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `google_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`tokens` text NOT NULL,
	`expires_at` integer NOT NULL
);
