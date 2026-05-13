CREATE TABLE `saved_addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(100) NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`name` varchar(255) NOT NULL,
	`street` varchar(500) NOT NULL,
	`street2` varchar(255),
	`city` varchar(255) NOT NULL,
	`state` varchar(100) NOT NULL,
	`zip` varchar(20) NOT NULL,
	`country` varchar(100) NOT NULL DEFAULT 'United States',
	`countryCode` varchar(10) NOT NULL DEFAULT 'US',
	`phone` varchar(50),
	`isVerified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `saved_addresses_user_idx` ON `saved_addresses` (`userId`);--> statement-breakpoint
CREATE INDEX `saved_addresses_user_default_idx` ON `saved_addresses` (`userId`,`isDefault`);