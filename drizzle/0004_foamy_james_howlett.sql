ALTER TABLE `categories` ADD `isDiscountable` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `protocol_items` ADD `isDiscountable` boolean DEFAULT true NOT NULL;