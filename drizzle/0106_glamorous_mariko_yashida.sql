ALTER TABLE `prospect_engagement` MODIFY COLUMN `eventType` enum('sms_link_click','page_view','masterclass_view','tier_view','enrollment_start','enrollment_complete','phone_call','email_sent','email_received','meeting','voicemail','note','status_change','follow_up_scheduled','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `prospects` MODIFY COLUMN `status` enum('new','contacted','clicked','viewing','enrolled','declined','stalled','engaged','waiting_on_client','ready_for_consult','not_ready') NOT NULL DEFAULT 'new';--> statement-breakpoint
ALTER TABLE `prospect_engagement` ADD `engagement_notes` text;--> statement-breakpoint
ALTER TABLE `prospect_engagement` ADD `loggedBy` varchar(255);--> statement-breakpoint
ALTER TABLE `prospect_engagement` ADD `duration` int;--> statement-breakpoint
ALTER TABLE `prospect_engagement` ADD `outcome` varchar(255);