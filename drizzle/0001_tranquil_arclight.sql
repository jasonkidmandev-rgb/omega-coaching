CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_protocol_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProtocolId` int NOT NULL,
	`protocolItemId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`isIncluded` boolean NOT NULL DEFAULT true,
	`isRecommended` boolean NOT NULL DEFAULT true,
	`customSchedule` text,
	`customDuration` varchar(255),
	`customPrice` decimal(10,2),
	`customNotes` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_protocol_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_protocol_requirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProtocolId` int NOT NULL,
	`requirementId` int,
	`customText` text,
	`isIncluded` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `client_protocol_requirements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_protocols` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320),
	`accessToken` varchar(64) NOT NULL,
	`templateId` int,
	`durationMonths` int NOT NULL DEFAULT 3,
	`status` enum('draft','pending_approval','approved','active','completed') NOT NULL DEFAULT 'draft',
	`approvedAt` timestamp,
	`discountPercent` decimal(5,2) DEFAULT '0',
	`coachingPackage` varchar(255),
	`coachingPrice` decimal(10,2) DEFAULT '0',
	`paymentMethod` enum('venmo','cc','other') DEFAULT 'venmo',
	`venmoHandle` varchar(100),
	`customRequirements` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_protocols_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_protocols_accessToken_unique` UNIQUE(`accessToken`)
);
--> statement-breakpoint
CREATE TABLE `protocol_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`schedule` text,
	`duration` varchar(255),
	`price` decimal(10,2) DEFAULT '0',
	`defaultQty` int DEFAULT 0,
	`purpose` text,
	`notes` text,
	`affiliateUrl` text,
	`affiliateCode` varchar(100),
	`itemType` enum('peptide','supplement','adjunct','supply','service','other') NOT NULL DEFAULT 'peptide',
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `protocol_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `protocol_requirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`text` text NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `protocol_requirements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`protocolItemId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`isRecommended` boolean NOT NULL DEFAULT true,
	`customNotes` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`durationMonths` int NOT NULL DEFAULT 3,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
