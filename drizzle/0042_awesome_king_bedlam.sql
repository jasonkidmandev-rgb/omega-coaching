CREATE TABLE `project_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProjectId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(100),
	`fileSize` int,
	`s3Key` varchar(500) NOT NULL,
	`s3Url` text,
	`category` enum('document','image','receipt','packing_slip','lab_results','other') NOT NULL DEFAULT 'document',
	`description` text,
	`uploadedByTeamMemberId` int,
	`uploadedByName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_tracking_info` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProjectId` int NOT NULL,
	`trackingNumber` varchar(255) NOT NULL,
	`carrier` varchar(100),
	`carrierUrl` text,
	`description` varchar(255),
	`status` enum('pending','in_transit','delivered','exception') NOT NULL DEFAULT 'pending',
	`estimatedDelivery` timestamp,
	`deliveredAt` timestamp,
	`createdByTeamMemberId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_tracking_info_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `attachment_project_idx` ON `project_attachments` (`clientProjectId`);--> statement-breakpoint
CREATE INDEX `attachment_category_idx` ON `project_attachments` (`category`);--> statement-breakpoint
CREATE INDEX `tracking_project_idx` ON `project_tracking_info` (`clientProjectId`);