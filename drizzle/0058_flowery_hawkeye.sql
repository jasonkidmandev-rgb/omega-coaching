CREATE TABLE `admin_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255),
	`role` enum('admin','manager','viewer','finance') NOT NULL,
	`token` varchar(64) NOT NULL,
	`invitedBy` int NOT NULL,
	`status` enum('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`acceptedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `admin_invitations_email_idx` ON `admin_invitations` (`email`);--> statement-breakpoint
CREATE INDEX `admin_invitations_token_idx` ON `admin_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `admin_invitations_status_idx` ON `admin_invitations` (`status`);