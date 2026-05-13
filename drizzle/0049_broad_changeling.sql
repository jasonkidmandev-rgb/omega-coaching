ALTER TABLE `store_waivers` ADD `expiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `store_waivers` ADD `renewalReminderSent` boolean DEFAULT false NOT NULL;