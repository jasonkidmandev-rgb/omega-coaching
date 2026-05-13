CREATE TABLE `journey_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientProtocolId` int,
	`title` varchar(255),
	`content` text NOT NULL,
	`mood` enum('great','good','okay','struggling','difficult'),
	`energyLevel` int,
	`sleepQuality` int,
	`tags` text,
	`isPrivate` boolean NOT NULL DEFAULT true,
	`noteDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `journey_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `progress_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientProtocolId` int,
	`imageUrl` text NOT NULL,
	`imageKey` varchar(500) NOT NULL,
	`caption` text,
	`category` enum('before','progress','after','other') NOT NULL DEFAULT 'progress',
	`isPrivate` boolean NOT NULL DEFAULT true,
	`takenAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `progress_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `journey_note_user_idx` ON `journey_notes` (`userId`);--> statement-breakpoint
CREATE INDEX `journey_note_protocol_idx` ON `journey_notes` (`clientProtocolId`);--> statement-breakpoint
CREATE INDEX `journey_note_date_idx` ON `journey_notes` (`noteDate`);--> statement-breakpoint
CREATE INDEX `progress_photo_user_idx` ON `progress_photos` (`userId`);--> statement-breakpoint
CREATE INDEX `progress_photo_protocol_idx` ON `progress_photos` (`clientProtocolId`);