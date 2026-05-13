ALTER TABLE `store_orders` ADD `trackingNumber` varchar(255);--> statement-breakpoint
ALTER TABLE `store_orders` ADD `trackingCarrier` varchar(100);--> statement-breakpoint
ALTER TABLE `store_orders` ADD `shippedAt` timestamp;