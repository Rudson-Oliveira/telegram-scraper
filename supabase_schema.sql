-- Schema PostgreSQL para Sistema Manus - Telegram Scraper
-- Data: 18 de Dezembro de 2024
-- Supabase: whcqfemvlzpuivqxmtua

-- Limpar tabelas existentes (se necessário)
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

-- Tabela de usuários
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

-- Tabela de credenciais do Telegram
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

-- Tabela de canais do Telegram
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
  -- Colunas adicionadas pela migração 001
  access_status VARCHAR(50) DEFAULT 'unknown',
  last_access_check TIMESTAMP,
  last_access_error TEXT
);

-- Tabela de mensagens do Telegram
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
  "aiClassification" VARCHAR(50) CHECK ("aiClassification" IN (
    'prompt', 'ferramenta', 'tutorial', 'noticia', 'discussao', 
    'recurso', 'codigo', 'imagem_ia', 'video_ia', 'audio_ia', 
    'workflow', 'healthcare', 'outro'
  )),
  "aiConfidence" INTEGER,
  "aiClassifiedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de histórico de raspagem
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

-- Tabela de categorias de conteúdo
CREATE TABLE content_categories (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6' NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de API Keys
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "keyName" VARCHAR(100) NOT NULL,
  "apiKey" VARCHAR(64) NOT NULL UNIQUE,
  permissions JSONB,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "lastUsedAt" TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de workers de raspagem
CREATE TABLE scraping_workers (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'idle' NOT NULL CHECK (status IN ('idle', 'running', 'paused', 'error')),
  "currentChannelId" INTEGER REFERENCES telegram_channels(id) ON DELETE SET NULL,
  "lastHeartbeat" TIMESTAMP,
  "messagesProcessed" INTEGER DEFAULT 0 NOT NULL,
  "errorCount" INTEGER DEFAULT 0 NOT NULL,
  "lastError" TEXT,
  config JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de integrações
CREATE TABLE integrations (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('whatsapp', 'telegram', 'email', 'slack', 'discord', 'custom', 'social', 'ai', 'funnel', 'sales')),
  provider VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'inactive' NOT NULL CHECK (status IN ('active', 'standby', 'inactive', 'error')),
  priority INTEGER DEFAULT 1 NOT NULL,
  credentials JSONB,
  stats JSONB,
  "isDefault" BOOLEAN DEFAULT false NOT NULL,
  "lastTestedAt" TIMESTAMP,
  "lastTestResult" VARCHAR(20) CHECK ("lastTestResult" IN ('success', 'failed', 'pending')),
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de agentes
CREATE TABLE agents (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "integrationId" INTEGER NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'primary' NOT NULL CHECK (role IN ('primary', 'backup', 'loadbalance')),
  status VARCHAR(20) DEFAULT 'offline' NOT NULL CHECK (status IN ('online', 'busy', 'offline', 'error')),
  "currentLoad" INTEGER DEFAULT 0 NOT NULL,
  "maxLoad" INTEGER DEFAULT 10 NOT NULL,
  "lastActiveAt" TIMESTAMP,
  "failureCount" INTEGER DEFAULT 0 NOT NULL,
  "successCount" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de auto-save
CREATE TABLE auto_save_state (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "stateKey" VARCHAR(64) NOT NULL,
  "stateData" JSONB,
  timestamp BIGINT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Criar índices de performance (migração 002)
CREATE INDEX idx_messages_user_channel ON telegram_messages("userId", "channelId");
CREATE INDEX idx_messages_type ON telegram_messages("messageType");
CREATE INDEX idx_messages_prompt ON telegram_messages("isPrompt");
CREATE INDEX idx_messages_date ON telegram_messages("messageDate" DESC);
CREATE INDEX idx_messages_created ON telegram_messages("createdAt" DESC);

CREATE INDEX idx_history_user_status ON scraping_history("userId", status);
CREATE INDEX idx_history_started ON scraping_history("startedAt" DESC);
CREATE INDEX idx_history_channel ON scraping_history("channelId");

CREATE INDEX idx_channels_user_active ON telegram_channels("userId", "isActive");
CREATE INDEX idx_channels_username ON telegram_channels("channelUsername");
CREATE INDEX idx_access_status ON telegram_channels(access_status);
CREATE INDEX idx_last_access_check ON telegram_channels(last_access_check);

CREATE INDEX idx_messages_stats ON telegram_messages("userId", "messageType", "isPrompt");

-- Criar função para atualizar updatedAt automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers para atualizar updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_telegram_credentials_updated_at BEFORE UPDATE ON telegram_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_telegram_channels_updated_at BEFORE UPDATE ON telegram_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraping_workers_updated_at BEFORE UPDATE ON scraping_workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_save_state_updated_at BEFORE UPDATE ON auto_save_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE users IS 'Tabela de usuários do sistema';
COMMENT ON TABLE telegram_credentials IS 'Credenciais da API do Telegram para cada usuário';
COMMENT ON TABLE telegram_channels IS 'Canais/grupos do Telegram para raspagem';
COMMENT ON TABLE telegram_messages IS 'Mensagens raspadas do Telegram';
COMMENT ON TABLE scraping_history IS 'Histórico e estatísticas de raspagem';
COMMENT ON TABLE content_categories IS 'Categorias de conteúdo para organização';
COMMENT ON TABLE api_keys IS 'Chaves de API para integrações externas';
COMMENT ON TABLE scraping_workers IS 'Status e configuração dos workers de raspagem';
COMMENT ON TABLE integrations IS 'Configurações de integrações com múltiplos provedores';
COMMENT ON TABLE agents IS 'Instâncias de agentes para rotação/balanceamento de carga';
COMMENT ON TABLE auto_save_state IS 'Estado de auto-save para sessões de usuário';

-- Inserir usuário padrão para testes
INSERT INTO users ("openId", name, email, role) 
VALUES ('default-user', 'Usuário Padrão', 'user@example.com', 'admin')
ON CONFLICT ("openId") DO NOTHING;

SELECT 'Schema criado com sucesso!' as status;
