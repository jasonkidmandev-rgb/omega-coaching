ALTER TABLE `client_notification_history` ADD `trackingId` varchar(64);--> statement-breakpoint
ALTER TABLE `client_notification_history` ADD `openedAt` timestamp;--> statement-breakpoint
ALTER TABLE `client_notification_history` ADD `openCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `client_notification_history` ADD `clickedAt` timestamp;--> statement-breakpoint
ALTER TABLE `client_notification_history` ADD `clickCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `client_notification_history_tracking_idx` ON `client_notification_history` (`trackingId`);