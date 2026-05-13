CREATE TABLE `paypal_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProtocolId` int NOT NULL,
	`paypalOrderId` varchar(255) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`status` varchar(50) NOT NULL DEFAULT 'CREATED',
	`payerEmail` varchar(320),
	`payerName` varchar(255),
	`transactionId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `paypal_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `paypal_orders_paypalOrderId_unique` UNIQUE(`paypalOrderId`)
);
