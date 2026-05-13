ALTER TABLE `store_orders` ADD `shippingName` varchar(255);--> statement-breakpoint
ALTER TABLE `store_orders` ADD `shippingStreet` varchar(500);--> statement-breakpoint
ALTER TABLE `store_orders` ADD `shippingCity` varchar(255);--> statement-breakpoint
ALTER TABLE `store_orders` ADD `shippingState` varchar(100);--> statement-breakpoint
ALTER TABLE `store_orders` ADD `shippingZip` varchar(20);--> statement-breakpoint
ALTER TABLE `store_orders` ADD `shippingCountry` varchar(100);--> statement-breakpoint
ALTER TABLE `store_orders` ADD `shippingPhone` varchar(50);