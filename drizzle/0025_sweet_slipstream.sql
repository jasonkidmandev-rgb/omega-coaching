ALTER TABLE `client_protocols` ADD `shippingName` varchar(255);--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `shippingStreet` varchar(500);--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `shippingCity` varchar(255);--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `shippingState` varchar(100);--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `shippingZip` varchar(20);--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `shippingCountry` varchar(100);--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `shippingPhone` varchar(50);