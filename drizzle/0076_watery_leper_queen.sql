ALTER TABLE `clients` ADD `isActiveInProjects` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `clientProjectId` int;