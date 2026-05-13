ALTER TABLE `checkin_schedules` ADD `currentStreak` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `checkin_schedules` ADD `longestStreak` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `checkin_schedules` ADD `totalResponses` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `checkin_schedules` ADD `totalSent` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `checkin_schedules` ADD `lastResponseAt` timestamp;