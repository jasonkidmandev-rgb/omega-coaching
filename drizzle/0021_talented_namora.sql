CREATE TABLE `email_branding_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`logoUrl` text,
	`primaryColor` varchar(7) DEFAULT '#ea580c',
	`secondaryColor` varchar(7) DEFAULT '#1e40af',
	`companyName` varchar(255) DEFAULT 'Omega Longevity',
	`tagline` varchar(255) DEFAULT 'Elite Level Health Optimization',
	`footerText` text,
	`socialLinks` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_branding_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProtocolId` int NOT NULL,
	`eventType` enum('sent','opened','clicked','bounced') NOT NULL,
	`emailType` enum('protocol_link','protocol_pdf','reminder','notification') NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`trackingToken` varchar(64) NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_events_trackingToken_unique` UNIQUE(`trackingToken`)
);
