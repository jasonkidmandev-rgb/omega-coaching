ALTER TABLE `users` ADD `enabledEmailNotificationTypes` text;--> statement-breakpoint
ALTER TABLE `users` ADD `digestFrequency` enum('none','daily','weekly') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `users` ADD `digestSendTime` varchar(5) DEFAULT '09:00';--> statement-breakpoint
ALTER TABLE `users` ADD `digestLastSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `pushSubscription` text;--> statement-breakpoint
ALTER TABLE `users` ADD `pushEnabledTypes` text;