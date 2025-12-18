-- Migração: Recalcular e corrigir contadores de mensagens
-- Data: 18 de Dezembro de 2024
-- Objetivo: Resolver inconsistência entre dashboard e histórico

-- Criar tabela temporária com contagens corretas
CREATE TEMPORARY TABLE temp_channel_counts AS
SELECT 
  channel_id,
  COUNT(*) as total_messages,
  COUNT(CASE WHEN message_type = 'image' THEN 1 END) as total_images,
  COUNT(CASE WHEN message_type = 'video' THEN 1 END) as total_videos,
  COUNT(CASE WHEN is_prompt = 1 THEN 1 END) as total_prompts,
  MAX(created_at) as last_message_at
FROM telegram_messages
GROUP BY channel_id;

-- Atualizar scraping_history com contagens corretas
-- Apenas para registros onde messagesCollected está incorreto
UPDATE scraping_history sh
INNER JOIN temp_channel_counts tcc ON sh.channel_id = tcc.channel_id
SET 
  sh.messages_collected = tcc.total_messages,
  sh.images_collected = tcc.total_images,
  sh.videos_collected = tcc.total_videos,
  sh.prompts_collected = tcc.total_prompts
WHERE sh.status = 'completed'
  AND (sh.messages_collected IS NULL OR sh.messages_collected != tcc.total_messages);

-- Limpar tabela temporária
DROP TEMPORARY TABLE IF EXISTS temp_channel_counts;

-- Log de execução
SELECT 
  'Migration completed' as status,
  COUNT(*) as total_channels,
  SUM(CASE WHEN access_status = 'unknown' THEN 1 ELSE 0 END) as unknown_channels,
  SUM(CASE WHEN access_status = 'accessible' THEN 1 ELSE 0 END) as accessible_channels
FROM telegram_channels;
