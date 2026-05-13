ALTER TABLE `client_protocols` ADD `lastViewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `viewCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `renewedFromId` int;--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `startDate` timestamp;--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `endDate` timestamp;