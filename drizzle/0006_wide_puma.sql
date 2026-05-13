CREATE TABLE `affiliate_clicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`protocolItemId` int NOT NULL,
	`clientProtocolId` int,
	`clickedAt` timestamp NOT NULL DEFAULT (now()),
	`userAgent` text,
	`ipHash` varchar(64),
	CONSTRAINT `affiliate_clicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coaching_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(10,2) DEFAULT '0',
	`durationDays` int DEFAULT 90,
	`features` text,
	`linkUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`isComingSoon` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coaching_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hub_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`icon` varchar(100),
	`category` enum('platform','course','coaching','resource') DEFAULT 'platform',
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hub_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `protocol_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProtocolId` int NOT NULL,
	`authorType` enum('coach','client') NOT NULL,
	`authorName` varchar(255),
	`message` text NOT NULL,
	`loomUrl` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `protocol_comments_id` PRIMARY KEY(`id`)
);
