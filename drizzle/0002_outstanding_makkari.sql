CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('protocol_approved','protocol_viewed','other') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`clientProtocolId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `receiveNotifications` boolean DEFAULT false NOT NULL;