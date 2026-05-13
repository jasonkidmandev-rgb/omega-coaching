CREATE TABLE `refund_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`protocolId` int NOT NULL,
	`clientId` varchar(255) NOT NULL,
	`reason` text NOT NULL,
	`status` enum('pending','approved','rejected','processed') DEFAULT 'pending',
	`refundAmount` varchar(50),
	`adminNotes` text,
	`requestedAt` timestamp DEFAULT (now()),
	`reviewedAt` timestamp,
	`processedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `refund_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `refund_protocol_idx` ON `refund_requests` (`protocolId`);--> statement-breakpoint
CREATE INDEX `refund_client_idx` ON `refund_requests` (`clientId`);--> statement-breakpoint
CREATE INDEX `refund_status_idx` ON `refund_requests` (`status`);