CREATE TABLE `page_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`path` varchar(500) NOT NULL,
	`referrer` varchar(1000),
	`referrerDomain` varchar(255),
	`userAgent` varchar(500),
	`ipHash` varchar(64),
	`country` varchar(100),
	`city` varchar(100),
	`deviceType` varchar(20),
	`browser` varchar(50),
	`os` varchar(50),
	`screenWidth` int,
	`screenHeight` int,
	`sessionId` varchar(64),
	`userId` int,
	`isBot` boolean DEFAULT false,
	`loadTime` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `pv_path_idx` ON `page_views` (`path`);--> statement-breakpoint
CREATE INDEX `pv_created_idx` ON `page_views` (`createdAt`);--> statement-breakpoint
CREATE INDEX `pv_session_idx` ON `page_views` (`sessionId`);--> statement-breakpoint
CREATE INDEX `pv_referrer_domain_idx` ON `page_views` (`referrerDomain`);--> statement-breakpoint
CREATE INDEX `pv_device_idx` ON `page_views` (`deviceType`);