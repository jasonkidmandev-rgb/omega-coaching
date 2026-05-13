CREATE TABLE `prospect_engagement` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prospectId` int NOT NULL,
	`eventType` enum('sms_link_click','page_view','masterclass_view','tier_view','enrollment_start','enrollment_complete') NOT NULL,
	`url` varchar(500),
	`metadata` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prospect_engagement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(50) NOT NULL,
	`status` enum('new','contacted','clicked','viewing','enrolled','declined','stalled') NOT NULL DEFAULT 'new',
	`source` varchar(100),
	`notes` text,
	`accessCode` varchar(100),
	`trackingToken` varchar(100) NOT NULL,
	`lastContactedAt` timestamp,
	`lastClickedAt` timestamp,
	`lastViewedAt` timestamp,
	`totalSmsSent` int NOT NULL DEFAULT 0,
	`totalClicks` int NOT NULL DEFAULT 0,
	`followUpCount` int NOT NULL DEFAULT 0,
	`nextFollowUpAt` timestamp,
	`followUpPaused` boolean NOT NULL DEFAULT false,
	`enrollmentId` int,
	`userId` int,
	`smsOptOut` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sms_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prospectId` int,
	`userId` int,
	`toPhone` varchar(50) NOT NULL,
	`fromPhone` varchar(50) NOT NULL,
	`body` text NOT NULL,
	`twilioSid` varchar(100),
	`status` enum('queued','sending','sent','delivered','undelivered','failed','not_configured') NOT NULL DEFAULT 'queued',
	`errorCode` varchar(20),
	`errorMessage` text,
	`direction` enum('outbound','inbound') NOT NULL DEFAULT 'outbound',
	`templateKey` varchar(100),
	`price` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sms_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sms_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`body` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`isDefault` boolean NOT NULL DEFAULT false,
	`category` enum('initial_outreach','follow_up','reminder','custom') NOT NULL DEFAULT 'custom',
	`sendAfterHours` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sms_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `prospect_engagement_prospect_idx` ON `prospect_engagement` (`prospectId`);--> statement-breakpoint
CREATE INDEX `prospect_engagement_event_type_idx` ON `prospect_engagement` (`eventType`);--> statement-breakpoint
CREATE INDEX `prospect_engagement_created_at_idx` ON `prospect_engagement` (`createdAt`);--> statement-breakpoint
CREATE INDEX `prospects_status_idx` ON `prospects` (`status`);--> statement-breakpoint
CREATE INDEX `prospects_email_idx` ON `prospects` (`email`);--> statement-breakpoint
CREATE INDEX `prospects_phone_idx` ON `prospects` (`phone`);--> statement-breakpoint
CREATE INDEX `prospects_tracking_token_idx` ON `prospects` (`trackingToken`);--> statement-breakpoint
CREATE INDEX `prospects_next_followup_idx` ON `prospects` (`nextFollowUpAt`);--> statement-breakpoint
CREATE INDEX `sms_messages_prospect_idx` ON `sms_messages` (`prospectId`);--> statement-breakpoint
CREATE INDEX `sms_messages_user_idx` ON `sms_messages` (`userId`);--> statement-breakpoint
CREATE INDEX `sms_messages_twilio_sid_idx` ON `sms_messages` (`twilioSid`);--> statement-breakpoint
CREATE INDEX `sms_messages_status_idx` ON `sms_messages` (`status`);--> statement-breakpoint
CREATE INDEX `sms_messages_created_at_idx` ON `sms_messages` (`createdAt`);--> statement-breakpoint
CREATE INDEX `sms_templates_key_idx` ON `sms_templates` (`templateKey`);--> statement-breakpoint
CREATE INDEX `sms_templates_category_idx` ON `sms_templates` (`category`);