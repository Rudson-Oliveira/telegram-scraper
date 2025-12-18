CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`integrationId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`role` enum('primary','backup','loadbalance') NOT NULL DEFAULT 'primary',
	`status` enum('online','busy','offline','error') NOT NULL DEFAULT 'offline',
	`currentLoad` int NOT NULL DEFAULT 0,
	`maxLoad` int NOT NULL DEFAULT 10,
	`lastActiveAt` timestamp,
	`failureCount` int NOT NULL DEFAULT 0,
	`successCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('whatsapp','telegram','email','slack','discord','custom') NOT NULL,
	`provider` varchar(50) NOT NULL,
	`status` enum('active','standby','inactive','error') NOT NULL DEFAULT 'inactive',
	`priority` int NOT NULL DEFAULT 1,
	`credentials` json,
	`stats` json,
	`isDefault` boolean NOT NULL DEFAULT false,
	`lastTestedAt` timestamp,
	`lastTestResult` enum('success','failed','pending'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrations_id` PRIMARY KEY(`id`)
);
