ALTER TABLE `announcement_history` ADD `recipientWaiverIds` text;--> statement-breakpoint
ALTER TABLE `announcement_history` ADD `filterCriteria` text;--> statement-breakpoint
ALTER TABLE `announcement_history` ADD `status` enum('sent','scheduled','cancelled') DEFAULT 'sent' NOT NULL;--> statement-breakpoint
ALTER TABLE `announcement_history` ADD `scheduledFor` timestamp;--> statement-breakpoint
ALTER TABLE `announcement_templates` ADD `category` enum('product_updates','promotions','reminders','general') DEFAULT 'general' NOT NULL;