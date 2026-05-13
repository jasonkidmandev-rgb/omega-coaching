CREATE TABLE `recipient_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`announcementId` int NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`trackingId` varchar(64) NOT NULL,
	`opened` boolean NOT NULL DEFAULT false,
	`openedAt` timestamp,
	`clicked` boolean NOT NULL DEFAULT false,
	`clickedAt` timestamp,
	`clickCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recipient_tracking_id` PRIMARY KEY(`id`),
	CONSTRAINT `recipient_tracking_trackingId_unique` UNIQUE(`trackingId`)
);
--> statement-breakpoint
CREATE INDEX `recipient_tracking_announcement_idx` ON `recipient_tracking` (`announcementId`);--> statement-breakpoint
CREATE INDEX `recipient_tracking_email_idx` ON `recipient_tracking` (`recipientEmail`);--> statement-breakpoint
CREATE INDEX `recipient_tracking_id_idx` ON `recipient_tracking` (`trackingId`);