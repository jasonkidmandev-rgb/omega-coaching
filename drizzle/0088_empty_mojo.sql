CREATE TABLE `protocol_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProtocolId` int NOT NULL,
	`sectionType` enum('periodization','training_split','program_guide') NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT false,
	`content` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `protocol_sections_id` PRIMARY KEY(`id`),
	CONSTRAINT `ps_protocol_section_unique` UNIQUE(`clientProtocolId`,`sectionType`)
);
--> statement-breakpoint
CREATE INDEX `ps_protocol_idx` ON `protocol_sections` (`clientProtocolId`);