CREATE TABLE `waiver_renewal_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`waiverId` int NOT NULL,
	`renewedAt` timestamp NOT NULL DEFAULT (now()),
	`previousExpiresAt` timestamp,
	`newExpiresAt` timestamp,
	`ipAddress` varchar(45),
	CONSTRAINT `waiver_renewal_history_id` PRIMARY KEY(`id`)
);
