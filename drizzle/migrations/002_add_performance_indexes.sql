-- Migração: Adicionar índices para melhorar performance
-- Data: 18 de Dezembro de 2024
-- Objetivo: Otimizar queries de contagem e estatísticas

-- Índices para tabela telegram_messages
CREATE INDEX IF NOT EXISTS idx_messages_user_channel ON telegram_messages(user_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON telegram_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_prompt ON telegram_messages(is_prompt);
CREATE INDEX IF NOT EXISTS idx_messages_date ON telegram_messages(message_date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created ON telegram_messages(created_at DESC);

-- Índices para tabela scraping_history
CREATE INDEX IF NOT EXISTS idx_history_user_status ON scraping_history(user_id, status);
CREATE INDEX IF NOT EXISTS idx_history_started ON scraping_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_channel ON scraping_history(channel_id);

-- Índices para tabela telegram_channels
CREATE INDEX IF NOT EXISTS idx_channels_user_active ON telegram_channels(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_channels_username ON telegram_channels(channel_username);

-- Índices compostos para queries comuns do dashboard
CREATE INDEX IF NOT EXISTS idx_messages_stats ON telegram_messages(user_id, message_type, is_prompt);
