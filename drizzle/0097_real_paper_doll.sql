CREATE TABLE `abandoned_checkouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`email` varchar(320),
	`clientName` varchar(255),
	`planKey` varchar(100) NOT NULL,
	`planName` varchar(255) NOT NULL,
	`planPrice` decimal(10,2) NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`recoveryEmailSentAt` timestamp,
	`recoveryEmailOpenedAt` timestamp,
	`recoveryEmailClickedAt` timestamp,
	`recoveredAt` timestamp,
	`sessionId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `abandoned_checkouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `abandoned_checkout_email_idx` ON `abandoned_checkouts` (`email`);--> statement-breakpoint
CREATE INDEX `abandoned_checkout_user_idx` ON `abandoned_checkouts` (`userId`);--> statement-breakpoint
CREATE INDEX `abandoned_checkout_started_idx` ON `abandoned_checkouts` (`startedAt`);--> statement-breakpoint
CREATE INDEX `abandoned_checkout_completed_idx` ON `abandoned_checkouts` (`completedAt`);--> statement-breakpoint
CREATE INDEX `abandoned_checkout_session_idx` ON `abandoned_checkouts` (`sessionId`);