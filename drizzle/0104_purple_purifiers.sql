CREATE TABLE `custom_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customOrderId` int NOT NULL,
	`inventoryItemId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`quantity` int NOT NULL,
	`pricePerUnit` decimal(10,2) NOT NULL,
	`originalPrice` decimal(10,2),
	`itemType` enum('product','service','shipping','custom') NOT NULL DEFAULT 'product',
	`isDiscountable` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `custom_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_order_venmo_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customOrderId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`venmoUsername` varchar(100),
	`venmoTransactionNote` text,
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320),
	`status` enum('pending','confirmed','rejected') NOT NULL DEFAULT 'pending',
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`verificationNotes` text,
	`grossAmount` decimal(10,2),
	`feeAmount` decimal(10,2),
	`netAmount` decimal(10,2),
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_order_venmo_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`userId` int,
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320) NOT NULL,
	`clientPhone` varchar(50),
	`paypalOrderId` varchar(255),
	`venmoTransactionId` varchar(255),
	`paymentMethod` enum('paypal','venmo') NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`shippingFee` decimal(10,2) NOT NULL DEFAULT '0',
	`total` decimal(10,2) NOT NULL,
	`status` enum('draft','pending_payment','pending_venmo','paid','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'draft',
	`shippingName` varchar(255),
	`shippingStreet` varchar(500),
	`shippingCity` varchar(255),
	`shippingState` varchar(100),
	`shippingZip` varchar(20),
	`shippingCountry` varchar(100),
	`shippingPhone` varchar(50),
	`shippingMethod` enum('standard','expedited','overnight','pickup') DEFAULT 'standard',
	`trackingNumber` varchar(255),
	`trackingCarrier` varchar(100),
	`adminNotes` text,
	`createdBy` int NOT NULL,
	`createdByName` varchar(255),
	`paypalFeeAmount` decimal(10,2),
	`paypalNetAmount` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`paidAt` timestamp,
	`shippedAt` timestamp,
	`deliveredAt` timestamp,
	`cancelledAt` timestamp,
	CONSTRAINT `custom_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `custom_order_item_order_idx` ON `custom_order_items` (`customOrderId`);--> statement-breakpoint
CREATE INDEX `custom_order_item_inventory_idx` ON `custom_order_items` (`inventoryItemId`);--> statement-breakpoint
CREATE INDEX `custom_venmo_order_idx` ON `custom_order_venmo_payments` (`customOrderId`);--> statement-breakpoint
CREATE INDEX `custom_venmo_status_idx` ON `custom_order_venmo_payments` (`status`);--> statement-breakpoint
CREATE INDEX `custom_order_user_idx` ON `custom_orders` (`userId`);--> statement-breakpoint
CREATE INDEX `custom_order_status_idx` ON `custom_orders` (`status`);--> statement-breakpoint
CREATE INDEX `custom_order_number_idx` ON `custom_orders` (`orderNumber`);--> statement-breakpoint
CREATE INDEX `custom_order_paypal_idx` ON `custom_orders` (`paypalOrderId`);--> statement-breakpoint
CREATE INDEX `custom_order_created_at_idx` ON `custom_orders` (`createdAt`);