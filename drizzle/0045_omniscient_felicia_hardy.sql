ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `receiveSmsNotifications` boolean DEFAULT false NOT NULL;