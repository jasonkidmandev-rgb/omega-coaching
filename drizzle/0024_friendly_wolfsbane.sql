CREATE TABLE `packing_slip_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packingSlipId` int NOT NULL,
	`protocolItemId` int NOT NULL,
	`itemName` varchar(255) NOT NULL,
	`itemType` varchar(50) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`quantityFulfilled` int NOT NULL DEFAULT 0,
	`quantityBackordered` int NOT NULL DEFAULT 0,
	`status` enum('pending','fulfilled','partial','backordered','cancelled') NOT NULL DEFAULT 'pending',
	`price` decimal(10,2),
	`notes` text,
	`fulfilledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `packing_slip_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `packing_slips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProtocolId` int NOT NULL,
	`protocolOrderId` int,
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320) NOT NULL,
	`status` enum('pending','in_progress','partial','complete','cancelled') NOT NULL DEFAULT 'pending',
	`totalItems` int NOT NULL DEFAULT 0,
	`itemsFulfilled` int NOT NULL DEFAULT 0,
	`itemsBackordered` int NOT NULL DEFAULT 0,
	`notes` text,
	`fulfilledBy` int,
	`fulfilledByName` varchar(255),
	`signatureData` text,
	`signedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `packing_slips_id` PRIMARY KEY(`id`)
);
