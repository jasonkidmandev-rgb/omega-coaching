ALTER TABLE `client_protocols` ADD `lastFollowUpSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `followUpCount` int DEFAULT 0 NOT NULL;