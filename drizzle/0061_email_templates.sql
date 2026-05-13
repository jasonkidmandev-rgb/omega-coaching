CREATE TABLE IF NOT EXISTS `email_template_customizations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `templateKey` varchar(100) NOT NULL,
  `subject` text,
  `bodyHtml` text,
  `bodyText` text,
  `variables` json DEFAULT ('[]'),
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `updatedBy` int,
  CONSTRAINT `email_template_customizations_id` PRIMARY KEY(`id`),
  CONSTRAINT `email_template_customizations_templateKey_unique` UNIQUE(`templateKey`)
);

CREATE TABLE IF NOT EXISTS `email_report_settings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `reportType` varchar(50) NOT NULL,
  `frequency` enum('daily','weekly','monthly') NOT NULL DEFAULT 'weekly',
  `isEnabled` boolean NOT NULL DEFAULT true,
  `recipients` json DEFAULT ('[]'),
  `dayOfWeek` int DEFAULT 1,
  `dayOfMonth` int DEFAULT 1,
  `hourOfDay` int DEFAULT 9,
  `lastSentAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `email_report_settings_id` PRIMARY KEY(`id`)
);
