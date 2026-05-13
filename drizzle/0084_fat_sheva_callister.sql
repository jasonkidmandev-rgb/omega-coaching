CREATE TABLE `enrollment_activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrollment_id` int NOT NULL,
	`action` varchar(50) NOT NULL,
	`details` json,
	`performed_by` varchar(255),
	`performed_by_user_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `enrollment_activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `eal_enrollment_idx` ON `enrollment_activity_log` (`enrollment_id`);--> statement-breakpoint
CREATE INDEX `eal_action_idx` ON `enrollment_activity_log` (`action`);--> statement-breakpoint
CREATE INDEX `eal_created_at_idx` ON `enrollment_activity_log` (`created_at`);