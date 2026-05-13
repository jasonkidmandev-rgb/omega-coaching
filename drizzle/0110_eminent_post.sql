CREATE TABLE `automation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`enrollmentId` int,
	`clientProtocolId` int,
	`clientProjectId` int,
	`clientId` int,
	`prospectId` int,
	`teamMemberId` int,
	`details` text,
	`status` enum('success','failed','skipped') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`triggeredBy` enum('payment','manual','cron','system') NOT NULL DEFAULT 'payment',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `automation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consultation_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prospectId` int,
	`enrollmentId` int,
	`clientId` int,
	`authorId` int NOT NULL,
	`consultType` enum('quick_hit_20min','strategy_session','discovery_call','follow_up','other') NOT NULL DEFAULT 'quick_hit_20min',
	`notes` text NOT NULL,
	`recommendations` text,
	`nextSteps` text,
	`suggestedTier` varchar(50),
	`suggestedProgram` varchar(255),
	`consultDate` timestamp NOT NULL,
	`reminderSentAt` timestamp,
	`noteEnteredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consultation_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `automation_events_type_idx` ON `automation_events` (`eventType`);--> statement-breakpoint
CREATE INDEX `automation_events_enrollment_idx` ON `automation_events` (`enrollmentId`);--> statement-breakpoint
CREATE INDEX `automation_events_created_at_idx` ON `automation_events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `consultation_notes_prospect_idx` ON `consultation_notes` (`prospectId`);--> statement-breakpoint
CREATE INDEX `consultation_notes_enrollment_idx` ON `consultation_notes` (`enrollmentId`);--> statement-breakpoint
CREATE INDEX `consultation_notes_author_idx` ON `consultation_notes` (`authorId`);--> statement-breakpoint
CREATE INDEX `consultation_notes_consult_date_idx` ON `consultation_notes` (`consultDate`);