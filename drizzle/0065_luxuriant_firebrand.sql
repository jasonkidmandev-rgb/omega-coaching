CREATE TABLE `store_promo_code_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promoCodeId` int NOT NULL,
	`orderId` int,
	`userId` int,
	`originalAmount` decimal(10,2) NOT NULL,
	`discountAmount` decimal(10,2) NOT NULL,
	`finalAmount` decimal(10,2) NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `store_promo_code_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_promo_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`discountType` enum('percent','fixed') NOT NULL,
	`discountValue` decimal(10,2) NOT NULL,
	`minimumOrderAmount` decimal(10,2),
	`maxUses` int,
	`usesCount` int NOT NULL DEFAULT 0,
	`oneTimePerUser` boolean NOT NULL DEFAULT false,
	`applicableCategories` text,
	`startsAt` timestamp,
	`expiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_promo_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `store_promo_usage_code_idx` ON `store_promo_code_usage` (`promoCodeId`);--> statement-breakpoint
CREATE INDEX `store_promo_usage_order_idx` ON `store_promo_code_usage` (`orderId`);--> statement-breakpoint
CREATE INDEX `store_promo_usage_user_idx` ON `store_promo_code_usage` (`userId`);--> statement-breakpoint
CREATE INDEX `store_promo_codes_code_idx` ON `store_promo_codes` (`code`);--> statement-breakpoint
CREATE INDEX `store_promo_codes_active_idx` ON `store_promo_codes` (`isActive`);