CREATE TABLE `protocol_inventory_mapping` (
	`id` int AUTO_INCREMENT NOT NULL,
	`protocolItemId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`quantityPerUnit` int NOT NULL DEFAULT 1,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `protocol_inventory_mapping_id` PRIMARY KEY(`id`)
);
