CREATE TABLE `cron_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobName` varchar(100) NOT NULL,
	`status` enum('success','error','partial') NOT NULL,
	`startedAt` timestamp NOT NULL,
	`completedAt` timestamp,
	`durationMs` int,
	`itemsProcessed` int DEFAULT 0,
	`itemsSucceeded` int DEFAULT 0,
	`itemsFailed` int DEFAULT 0,
	`errorMessage` text,
	`details` text,
	`triggeredBy` enum('cron','manual','startup') NOT NULL DEFAULT 'cron',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cron_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `cron_runs_job_name_idx` ON `cron_runs` (`jobName`);--> statement-breakpoint
CREATE INDEX `cron_runs_started_at_idx` ON `cron_runs` (`startedAt`);--> statement-breakpoint
CREATE INDEX `cron_runs_job_status_idx` ON `cron_runs` (`jobName`,`status`);