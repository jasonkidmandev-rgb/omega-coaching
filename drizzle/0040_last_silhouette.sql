CREATE TABLE `appointment_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`appointmentTypeId` int NOT NULL,
	`sessionCount` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`bonusSessions` int DEFAULT 0,
	`validDays` int DEFAULT 365,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointment_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointment_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`duration` int NOT NULL DEFAULT 30,
	`price` decimal(10,2),
	`color` varchar(7) DEFAULT '#f97316',
	`isActive` boolean NOT NULL DEFAULT true,
	`allowOnlineBooking` boolean NOT NULL DEFAULT true,
	`requiresApproval` boolean NOT NULL DEFAULT false,
	`bufferBefore` int DEFAULT 0,
	`bufferAfter` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointment_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coachId` int NOT NULL,
	`clientProtocolId` int,
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320) NOT NULL,
	`clientPhone` varchar(50),
	`appointmentTypeId` int NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`status` enum('scheduled','confirmed','cancelled','completed','no_show') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`clientNotes` text,
	`meetingLink` varchar(500),
	`reminderSent` boolean NOT NULL DEFAULT false,
	`confirmationSent` boolean NOT NULL DEFAULT false,
	`cancellationReason` text,
	`cancelledAt` timestamp,
	`cancelledBy` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `availability_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coachId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `availability_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blocked_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coachId` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`reason` varchar(255),
	`isAllDay` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocked_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientEmail` varchar(320) NOT NULL,
	`packageId` int NOT NULL,
	`sessionsRemaining` int NOT NULL,
	`sessionsUsed` int NOT NULL DEFAULT 0,
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`status` enum('active','expired','exhausted') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `appointment_coach_idx` ON `appointments` (`coachId`);--> statement-breakpoint
CREATE INDEX `appointment_client_idx` ON `appointments` (`clientEmail`);--> statement-breakpoint
CREATE INDEX `appointment_status_idx` ON `appointments` (`status`);--> statement-breakpoint
CREATE INDEX `appointment_start_idx` ON `appointments` (`startTime`);--> statement-breakpoint
CREATE INDEX `availability_coach_idx` ON `availability_slots` (`coachId`);--> statement-breakpoint
CREATE INDEX `blocked_coach_idx` ON `blocked_slots` (`coachId`);--> statement-breakpoint
CREATE INDEX `client_package_client_idx` ON `client_packages` (`clientEmail`);--> statement-breakpoint
CREATE INDEX `client_package_status_idx` ON `client_packages` (`status`);