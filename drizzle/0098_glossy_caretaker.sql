ALTER TABLE `packing_slips` MODIFY COLUMN `clientProtocolId` int;--> statement-breakpoint
ALTER TABLE `packing_slips` ADD `storeOrderId` int;--> statement-breakpoint
ALTER TABLE `packing_slips` ADD `source` enum('protocol','store') DEFAULT 'protocol' NOT NULL;