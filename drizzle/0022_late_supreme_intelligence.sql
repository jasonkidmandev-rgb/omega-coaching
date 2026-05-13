CREATE TABLE `protocol_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProtocolId` int NOT NULL,
	`clientEmail` varchar(320) NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`stripeSessionId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`totalAmount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'usd',
	`itemsSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `protocol_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `protocol_orders_stripeSessionId_unique` UNIQUE(`stripeSessionId`)
);
