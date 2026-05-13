ALTER TABLE `client_protocols` ADD `inviteSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `store_waivers` ADD `renewalToken` varchar(64);--> statement-breakpoint
ALTER TABLE `store_waivers` ADD CONSTRAINT `store_waivers_renewalToken_unique` UNIQUE(`renewalToken`);