CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`keyName` varchar(100) NOT NULL,
	`apiKey` varchar(64) NOT NULL,
	`permissions` json DEFAULT ('["read"]'),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastUsedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_apiKey_unique` UNIQUE(`apiKey`)
);
--> statement-breakpoint
CREATE TABLE `scraping_workers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('idle','running','paused','error') NOT NULL DEFAULT 'idle',
	`currentChannelId` int,
	`lastHeartbeat` timestamp,
	`messagesProcessed` int NOT NULL DEFAULT 0,
	`errorCount` int NOT NULL DEFAULT 0,
	`lastError` text,
	`config` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scraping_workers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `telegram_messages` ADD `contentHash` varchar(64);--> statement-breakpoint
ALTER TABLE `telegram_messages` ADD `aiClassification` enum('prompt','ferramenta','tutorial','noticia','discussao','recurso','codigo','imagem_ia','video_ia','audio_ia','outro');--> statement-breakpoint
ALTER TABLE `telegram_messages` ADD `aiConfidence` int;--> statement-breakpoint
ALTER TABLE `telegram_messages` ADD `aiClassifiedAt` timestamp;