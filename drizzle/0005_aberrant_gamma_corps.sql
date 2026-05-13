CREATE TABLE `program_phases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programId` int NOT NULL,
	`phaseNumber` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`goals` text,
	`durationMonths` int NOT NULL DEFAULT 3,
	`templateId` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `program_phases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`totalMonths` int NOT NULL DEFAULT 12,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `programId` int;--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `currentPhaseId` int;--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `phaseStartDate` timestamp;--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `programStartDate` timestamp;