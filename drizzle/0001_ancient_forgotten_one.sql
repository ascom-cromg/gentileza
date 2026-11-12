CREATE TABLE `deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`payload_hash` text NOT NULL,
	`recipient_email` text NOT NULL,
	`status` text NOT NULL,
	`provider_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `deliveries_actor_created_idx` ON `deliveries` (`actor`,`created_at`);--> statement-breakpoint
CREATE TABLE `staff` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`search_text` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);
