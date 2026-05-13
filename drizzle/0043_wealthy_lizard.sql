CREATE TABLE `store_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeOrderId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`pricePerUnit` decimal(10,2) NOT NULL,
	`isDiscountable` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `store_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`paypalOrderId` varchar(255),
	`venmoTransactionId` varchar(255),
	`paymentMethod` enum('paypal','venmo') NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`total` decimal(10,2) NOT NULL,
	`status` enum('pending','paid','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`payerEmail` varchar(320),
	`payerName` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`paidAt` timestamp,
	CONSTRAINT `store_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `store_order_item_order_idx` ON `store_order_items` (`storeOrderId`);--> statement-breakpoint
CREATE INDEX `store_order_item_inventory_idx` ON `store_order_items` (`inventoryItemId`);--> statement-breakpoint
CREATE INDEX `store_order_user_idx` ON `store_orders` (`userId`);--> statement-breakpoint
CREATE INDEX `store_order_status_idx` ON `store_orders` (`status`);--> statement-breakpoint
CREATE INDEX `store_order_paypal_idx` ON `store_orders` (`paypalOrderId`);