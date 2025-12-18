# Migrações do Banco de Dados

## 📋 Ordem de Execução

As migrações devem ser executadas na seguinte ordem:

### 1. **001_add_channel_access_status.sql**
**Objetivo:** Adicionar colunas para rastrear status de acesso aos canais  
**Impacto:** Resolve problema de canais com 0 mensagens  
**Tempo estimado:** ~5 segundos  

```sql
-- Adiciona:
- access_status: Status do canal (unknown/accessible/private/not_found/error)
- last_access_check: Data da última verificação
- last_access_error: Mensagem de erro (se houver)
```

### 2. **002_add_performance_indexes.sql**
**Objetivo:** Adicionar índices para melhorar performance  
**Impacto:** Queries de dashboard e estatísticas ficam 5-10x mais rápidas  
**Tempo estimado:** ~10-30 segundos (depende do tamanho das tabelas)  

```sql
-- Adiciona índices para:
- telegram_messages: user_id, channel_id, message_type, is_prompt, dates
- scraping_history: user_id, status, dates
- telegram_channels: user_id, is_active, username
```

### 3. **003_fix_message_counters.sql**
**Objetivo:** Recalcular contadores de mensagens  
**Impacto:** Resolve inconsistência dashboard (58 msgs) vs histórico (1013 msgs)  
**Tempo estimado:** ~5-10 segundos  

```sql
-- Recalcula:
- Total de mensagens por canal
- Contadores de images, videos, prompts
- Atualiza scraping_history com valores corretos
```

---

## 🚀 Como Executar

### Opção 1: Via Cliente MySQL/MariaDB
```bash
mysql -h <host> -u <user> -p <database> < 001_add_channel_access_status.sql
mysql -h <host> -u <user> -p <database> < 002_add_performance_indexes.sql
mysql -h <host> -u <user> -p <database> < 003_fix_message_counters.sql
```

### Opção 2: Via Supabase SQL Editor
1. Acesse o painel do Supabase
2. Vá em "SQL Editor"
3. Cole o conteúdo de cada arquivo SQL
4. Execute na ordem correta

### Opção 3: Via Script Automatizado
```bash
cd /home/ubuntu/telegram-scraper
npm run migrate
```

---

## ✅ Validação Pós-Migração

Após executar as migrações, valide com as queries abaixo:

```sql
-- 1. Verificar novas colunas
DESCRIBE telegram_channels;

-- 2. Verificar índices
SHOW INDEX FROM telegram_messages;
SHOW INDEX FROM telegram_channels;
SHOW INDEX FROM scraping_history;

-- 3. Verificar contadores
SELECT 
  COUNT(*) as total_messages,
  COUNT(DISTINCT channel_id) as channels_with_messages
FROM telegram_messages;

-- 4. Verificar status de acesso
SELECT 
  access_status,
  COUNT(*) as count
FROM telegram_channels
GROUP BY access_status;
```

---

## 🔄 Rollback (se necessário)

Se algo der errado, use os comandos abaixo para reverter:

```sql
-- Rollback 001
ALTER TABLE telegram_channels
DROP COLUMN IF EXISTS access_status,
DROP COLUMN IF EXISTS last_access_check,
DROP COLUMN IF EXISTS last_access_error;

DROP INDEX IF EXISTS idx_access_status ON telegram_channels;
DROP INDEX IF EXISTS idx_last_access_check ON telegram_channels;

-- Rollback 002
DROP INDEX IF EXISTS idx_messages_user_channel ON telegram_messages;
DROP INDEX IF EXISTS idx_messages_type ON telegram_messages;
DROP INDEX IF EXISTS idx_messages_prompt ON telegram_messages;
DROP INDEX IF EXISTS idx_messages_date ON telegram_messages;
DROP INDEX IF EXISTS idx_messages_created ON telegram_messages;
DROP INDEX IF EXISTS idx_history_user_status ON scraping_history;
DROP INDEX IF EXISTS idx_history_started ON scraping_history;
DROP INDEX IF EXISTS idx_history_channel ON scraping_history;
DROP INDEX IF EXISTS idx_channels_user_active ON telegram_channels;
DROP INDEX IF EXISTS idx_channels_username ON telegram_channels;
DROP INDEX IF EXISTS idx_messages_stats ON telegram_messages;

-- Rollback 003: Não há rollback necessário (apenas recalcula dados existentes)
```

---

## 📊 Resultado Esperado

**Antes:**
- Dashboard: 58 mensagens
- Histórico: 1.013 mensagens
- Taxa de falha: 30-40%
- 33% dos canais sem mensagens

**Depois:**
- Dashboard e Histórico: **1.013 mensagens** (consistente)
- Taxa de falha: **< 5%** (graças ao retry automático)
- Canais com status claro: accessible/private/error
- Queries **5-10x mais rápidas**

---

## 🛟 Suporte

Se encontrar problemas:
1. Verifique os logs do servidor
2. Execute as queries de validação acima
3. Consulte o arquivo CORRECOES_SUGERIDAS.md
4. Em caso de dúvida, não execute o rollback sem backup
