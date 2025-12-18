CREATE TABLE `content_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(7) NOT NULL DEFAULT '#3B82F6',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scraping_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`channelId` int NOT NULL,
	`status` enum('running','completed','failed','paused') NOT NULL DEFAULT 'running',
	`messagesCollected` int NOT NULL DEFAULT 0,
	`imagesCollected` int NOT NULL DEFAULT 0,
	`videosCollected` int NOT NULL DEFAULT 0,
	`promptsCollected` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `scraping_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegram_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`channelName` varchar(255) NOT NULL,
	`channelId` varchar(64),
	`channelUsername` varchar(255),
	`channelType` enum('channel','group','supergroup') NOT NULL DEFAULT 'channel',
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastScrapedAt` timestamp,
	`totalMessages` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegram_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`apiId` varchar(32) NOT NULL,
	`apiHash` varchar(64) NOT NULL,
	`phoneNumber` varchar(20),
	`sessionString` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegram_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`channelId` int NOT NULL,
	`userId` int NOT NULL,
	`telegramMessageId` bigint,
	`messageType` enum('text','image','video','document','audio','prompt','other') NOT NULL DEFAULT 'text',
	`content` text,
	`caption` text,
	`senderName` varchar(255),
	`senderId` varchar(64),
	`messageDate` timestamp,
	`hasMedia` boolean NOT NULL DEFAULT false,
	`mediaUrl` text,
	`mediaType` varchar(64),
	`mediaSize` int,
	`metadata` json,
	`tags` json,
	`isPrompt` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegram_messages_id` PRIMARY KEY(`id`)
);
