ALTER TABLE `categories` ADD `displayName` varchar(255);--> statement-breakpoint
ALTER TABLE `client_protocol_items` ADD `customCategoryName` varchar(255);--> statement-breakpoint
ALTER TABLE `protocol_items` ADD `customCategoryName` varchar(255);