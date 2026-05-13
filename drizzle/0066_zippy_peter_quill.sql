ALTER TABLE `transformation_enrollments` ADD `email` varchar(255);--> statement-breakpoint
ALTER TABLE `transformation_enrollments` ADD `clientName` varchar(255);--> statement-breakpoint
ALTER TABLE `transformation_enrollments` ADD `authToken` varchar(255);--> statement-breakpoint
ALTER TABLE `transformation_enrollments` ADD `authTokenExpiresAt` timestamp;