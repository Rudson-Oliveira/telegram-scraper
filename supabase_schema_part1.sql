-- Parte 1: Limpar e criar tabelas principais
DROP TABLE IF EXISTS auto_save_state CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;
DROP TABLE IF EXISTS scraping_workers CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS content_categories CASCADE;
DROP TABLE IF EXISTS scraping_history CASCADE;
DROP TABLE IF EXISTS telegram_messages CASCADE;
DROP TABLE IF EXISTS telegram_channels CASCADE;
DROP TABLE IF EXISTS telegram_credentials CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  "loginMethod" VARCHAR(64),
  role VARCHAR(20) DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "lastSignedIn" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE telegram_credentials (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "apiId" VARCHAR(32) NOT NULL,
  "apiHash" VARCHAR(64) NOT NULL,
  "phoneNumber" VARCHAR(20),
  "sessionString" TEXT,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE telegram_channels (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "channelName" VARCHAR(255) NOT NULL,
  "channelId" VARCHAR(64),
  "channelUsername" VARCHAR(255),
  "channelType" VARCHAR(20) DEFAULT 'channel' NOT NULL CHECK ("channelType" IN ('channel', 'group', 'supergroup')),
  description TEXT,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "lastScrapedAt" TIMESTAMP,
  "totalMessages" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  access_status VARCHAR(50) DEFAULT 'unknown',
  last_access_check TIMESTAMP,
  last_access_error TEXT
);

CREATE TABLE telegram_messages (
  id SERIAL PRIMARY KEY,
  "channelId" INTEGER NOT NULL REFERENCES telegram_channels(id) ON DELETE CASCADE,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "telegramMessageId" BIGINT,
  "messageType" VARCHAR(20) DEFAULT 'text' NOT NULL CHECK ("messageType" IN ('text', 'image', 'video', 'document', 'audio', 'prompt', 'other')),
  content TEXT,
  caption TEXT,
  "senderName" VARCHAR(255),
  "senderId" VARCHAR(64),
  "messageDate" TIMESTAMP,
  "hasMedia" BOOLEAN DEFAULT false NOT NULL,
  "mediaUrl" TEXT,
  "mediaType" VARCHAR(64),
  "mediaSize" INTEGER,
  metadata JSONB,
  tags JSONB,
  "isPrompt" BOOLEAN DEFAULT false NOT NULL,
  "contentHash" VARCHAR(64),
  "aiClassification" VARCHAR(50),
  "aiConfidence" INTEGER,
  "aiClassifiedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE scraping_history (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "channelId" INTEGER NOT NULL REFERENCES telegram_channels(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'running' NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'paused')),
  "messagesCollected" INTEGER DEFAULT 0 NOT NULL,
  "imagesCollected" INTEGER DEFAULT 0 NOT NULL,
  "videosCollected" INTEGER DEFAULT 0 NOT NULL,
  "promptsCollected" INTEGER DEFAULT 0 NOT NULL,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "completedAt" TIMESTAMP
);

INSERT INTO users ("openId", name, email, role) 
VALUES ('default-user', 'Usuário Padrão', 'user@example.com', 'admin')
ON CONFLICT ("openId") DO NOTHING;

SELECT 'Parte 1 concluída - Tabelas principais criadas' as status;
