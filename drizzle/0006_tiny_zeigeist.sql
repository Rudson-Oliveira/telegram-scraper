CREATE TABLE `auto_save_state` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stateKey` varchar(64) NOT NULL,
	`stateData` json,
	`timestamp` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `auto_save_state_id` PRIMARY KEY(`id`)
);
