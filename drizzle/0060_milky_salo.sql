CREATE TABLE `peptide_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peptide_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `peptides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`purpose` text,
	`dosing` varchar(255),
	`reconstitution` text,
	`timing` varchar(255),
	`frequency` varchar(255),
	`storage` varchar(255),
	`notes` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `peptides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `peptide_categories_sort_order_idx` ON `peptide_categories` (`sortOrder`);--> statement-breakpoint
CREATE INDEX `peptides_category_idx` ON `peptides` (`categoryId`);--> statement-breakpoint
CREATE INDEX `peptides_sort_order_idx` ON `peptides` (`sortOrder`);