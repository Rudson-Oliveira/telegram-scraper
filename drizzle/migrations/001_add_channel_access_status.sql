-- Migração: Adicionar colunas de status de acesso aos canais
-- Data: 18 de Dezembro de 2024
-- Objetivo: Resolver problema de canais com 0 mensagens

-- Adicionar colunas de status de acesso
ALTER TABLE telegram_channels 
ADD COLUMN IF NOT EXISTS access_status VARCHAR(50) DEFAULT 'unknown' COMMENT 'Status de acesso: unknown, accessible, private, not_found, error',
ADD COLUMN IF NOT EXISTS last_access_check TIMESTAMP NULL COMMENT 'Última verificação de acesso',
ADD COLUMN IF NOT EXISTS last_access_error TEXT NULL COMMENT 'Último erro de acesso encontrado';

-- Criar índice para melhorar performance de queries por status
CREATE INDEX IF NOT EXISTS idx_access_status ON telegram_channels(access_status);
CREATE INDEX IF NOT EXISTS idx_last_access_check ON telegram_channels(last_access_check);

-- Atualizar canais com 0 mensagens para status 'unknown'
-- Estes canais precisam ser verificados
UPDATE telegram_channels tc
LEFT JOIN (
  SELECT channel_id, COUNT(*) as msg_count
  FROM telegram_messages
  GROUP BY channel_id
) tm ON tc.id = tm.channel_id
SET tc.access_status = 'unknown'
WHERE (tm.msg_count IS NULL OR tm.msg_count = 0)
  AND tc.access_status = 'unknown';

-- Marcar canais com mensagens como 'accessible'
UPDATE telegram_channels tc
INNER JOIN (
  SELECT channel_id, COUNT(*) as msg_count
  FROM telegram_messages
  GROUP BY channel_id
  HAVING msg_count > 0
) tm ON tc.id = tm.channel_id
SET tc.access_status = 'accessible',
    tc.last_access_check = NOW()
WHERE tc.access_status = 'unknown';
