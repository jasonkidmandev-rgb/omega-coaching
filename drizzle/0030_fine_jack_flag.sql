CREATE TABLE `onboarding_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`icon` varchar(50),
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`ctaText` text,
	`linkUrl` text,
	`linkType` enum('internal','external','modal') NOT NULL DEFAULT 'external',
	`badge` varchar(50),
	`badgeColor` varchar(20),
	`icon` varchar(50),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPopular` boolean NOT NULL DEFAULT false,
	`isRecommended` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`welcomeTitle` varchar(255) NOT NULL DEFAULT 'Welcome to Omega Longevity',
	`welcomeSubtitle` text,
	`videoUrl` text,
	`videoPlaceholderText` varchar(255) DEFAULT 'Video coming soon',
	`stepTwoTitle` varchar(255) DEFAULT 'What brings you here today?',
	`stepTwoSubtitle` text,
	`stepThreeTitle` varchar(255) DEFAULT 'Here''s your action plan',
	`ctaButtonText` varchar(100) DEFAULT 'Let''s Get Started',
	`persistentButtonText` varchar(100) DEFAULT 'Get Started Guide',
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_onboarding_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`hasCompletedOnboarding` boolean NOT NULL DEFAULT false,
	`selectedOptionIds` text,
	`completedAt` timestamp,
	`lastViewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_onboarding_status_id` PRIMARY KEY(`id`)
);
