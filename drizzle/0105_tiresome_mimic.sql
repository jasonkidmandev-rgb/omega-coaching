ALTER TABLE `packing_slips` MODIFY COLUMN `source` enum('protocol','store','custom') NOT NULL DEFAULT 'protocol';--> statement-breakpoint
ALTER TABLE `packing_slips` ADD `customOrderId` int;