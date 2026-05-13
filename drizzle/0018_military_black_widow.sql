CREATE TABLE `clone_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceProtocolId` int,
	`sourceProtocolName` varchar(255) NOT NULL,
	`targetProtocolId` int NOT NULL,
	`targetProtocolName` varchar(255) NOT NULL,
	`cloneType` enum('new_client','existing_client','bulk','from_template') NOT NULL,
	`itemsCloned` int NOT NULL DEFAULT 0,
	`clonedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clone_history_id` PRIMARY KEY(`id`)
);
