ALTER TABLE `announcement_history` ADD `trackingId` varchar(64);--> statement-breakpoint
ALTER TABLE `announcement_history` ADD `opens` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `announcement_history` ADD `clicks` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `announcement_history` ADD `recurrencePattern` enum('none','weekly','biweekly','monthly') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `announcement_history` ADD `recurrenceEndDate` timestamp;--> statement-breakpoint
ALTER TABLE `announcement_history` ADD `parentAnnouncementId` int;