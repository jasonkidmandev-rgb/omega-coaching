CREATE TABLE `product_deletion_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`originalProductId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`productData` json NOT NULL,
	`deletedBy` int NOT NULL,
	`deletedByName` varchar(255),
	`deletionReason` text,
	`affectedClientProtocols` int NOT NULL DEFAULT 0,
	`affectedTemplates` int NOT NULL DEFAULT 0,
	`isRestored` boolean NOT NULL DEFAULT false,
	`restoredAt` timestamp,
	`restoredBy` int,
	`restoredProductId` int,
	`deletedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_deletion_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_merge_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceProductId` int NOT NULL,
	`sourceProductName` varchar(255) NOT NULL,
	`sourceProductData` json NOT NULL,
	`targetProductId` int NOT NULL,
	`targetProductName` varchar(255) NOT NULL,
	`clientProtocolItemsMerged` int NOT NULL DEFAULT 0,
	`templateItemsMerged` int NOT NULL DEFAULT 0,
	`mergedBy` int NOT NULL,
	`mergedByName` varchar(255),
	`mergeReason` text,
	`mergedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_merge_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `deletion_log_original_product_idx` ON `product_deletion_log` (`originalProductId`);--> statement-breakpoint
CREATE INDEX `deletion_log_deleted_by_idx` ON `product_deletion_log` (`deletedBy`);--> statement-breakpoint
CREATE INDEX `deletion_log_deleted_at_idx` ON `product_deletion_log` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `deletion_log_is_restored_idx` ON `product_deletion_log` (`isRestored`);--> statement-breakpoint
CREATE INDEX `merge_log_source_idx` ON `product_merge_log` (`sourceProductId`);--> statement-breakpoint
CREATE INDEX `merge_log_target_idx` ON `product_merge_log` (`targetProductId`);--> statement-breakpoint
CREATE INDEX `merge_log_merged_by_idx` ON `product_merge_log` (`mergedBy`);--> statement-breakpoint
CREATE INDEX `merge_log_merged_at_idx` ON `product_merge_log` (`mergedAt`);