CREATE TABLE `healthie_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProtocolId` int,
	`healthiePatientId` varchar(255) NOT NULL,
	`healthieInvoiceId` varchar(255) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`description` varchar(500),
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `healthie_invoices_id` PRIMARY KEY(`id`)
);
