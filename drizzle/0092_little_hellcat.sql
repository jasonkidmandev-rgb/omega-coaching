CREATE TABLE `engagement_level_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProtocolId` int NOT NULL,
	`oldLevel` varchar(50),
	`newLevel` varchar(50) NOT NULL,
	`changedByUserId` int,
	`changedByName` varchar(255),
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `engagement_level_history_id` PRIMARY KEY(`id`)
);
