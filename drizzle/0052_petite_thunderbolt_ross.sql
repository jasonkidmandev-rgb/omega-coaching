CREATE TABLE `announcement_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subject` varchar(500) NOT NULL,
	`message` text NOT NULL,
	`recipientCount` int NOT NULL,
	`sentBy` int,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `announcement_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `announcement_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`message` text NOT NULL,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcement_templates_id` PRIMARY KEY(`id`)
);
