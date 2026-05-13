ALTER TABLE `client_protocols` ADD `onboardingCompletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `onboardingPath` varchar(50);--> statement-breakpoint
ALTER TABLE `client_protocols` ADD `onboardingSelection` varchar(100);