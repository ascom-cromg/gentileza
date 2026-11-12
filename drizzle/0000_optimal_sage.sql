CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`message` text NOT NULL,
	`search_text` text NOT NULL,
	`category` text NOT NULL,
	`color` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_created_idx` ON `messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `messages_actor_idx` ON `messages` (`actor`);--> statement-breakpoint
CREATE TABLE `reactions` (
	`message_id` text NOT NULL,
	`actor` text NOT NULL,
	PRIMARY KEY(`message_id`, `actor`),
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
