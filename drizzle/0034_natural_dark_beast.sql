CREATE TABLE `team_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamMemberId` int NOT NULL,
	`type` enum('task_assigned','task_overdue','subtask_assigned','subtask_overdue','project_assigned','deadline_approaching','mention') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`clientProjectId` int,
	`projectTaskId` int,
	`projectSubtaskId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`isEmailSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_notifications_id` PRIMARY KEY(`id`)
);
