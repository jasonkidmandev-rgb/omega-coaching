CREATE TABLE `client_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProtocolId` int,
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320),
	`workflowTemplateId` int,
	`currentLifecycleStageId` int,
	`status` enum('active','on_hold','completed','cancelled') NOT NULL DEFAULT 'active',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`startDate` timestamp,
	`targetEndDate` timestamp,
	`actualEndDate` timestamp,
	`assignedTeamMemberId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lifecycle_stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`color` varchar(20) DEFAULT '#6B7280',
	`icon` varchar(50),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lifecycle_stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProjectId` int NOT NULL,
	`actorTeamMemberId` int,
	`actorName` varchar(255),
	`actionType` enum('project_created','project_updated','stage_changed','task_created','task_completed','task_assigned','subtask_created','subtask_completed','subtask_assigned','note_added','status_changed','priority_changed') NOT NULL,
	`description` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProjectId` int NOT NULL,
	`authorTeamMemberId` int,
	`authorName` varchar(255),
	`noteType` enum('general','decision','handoff','issue','update') NOT NULL DEFAULT 'general',
	`content` text NOT NULL,
	`isPinned` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_subtasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectTaskId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('pending','in_progress','completed','blocked','skipped') NOT NULL DEFAULT 'pending',
	`assignedTeamMemberId` int,
	`dueDate` timestamp,
	`completedAt` timestamp,
	`completedByTeamMemberId` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isRequired` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_subtasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientProjectId` int NOT NULL,
	`lifecycleStageId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('pending','in_progress','completed','blocked','skipped') NOT NULL DEFAULT 'pending',
	`assignedTeamMemberId` int,
	`dueDate` timestamp,
	`completedAt` timestamp,
	`completedByTeamMemberId` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isRequired` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`roleId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(20) DEFAULT '#6B7280',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_template_subtasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowTemplateTaskId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`defaultOwnerRoleId` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isRequired` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflow_template_subtasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_template_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowTemplateId` int NOT NULL,
	`lifecycleStageId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`defaultOwnerRoleId` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`dueDaysFromStart` int,
	`isRequired` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflow_template_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`durationDays` int NOT NULL DEFAULT 90,
	`isDefault` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_templates_id` PRIMARY KEY(`id`)
);
