# 🧪 GUIA DE TESTE E VALIDAÇÃO - Telegram Scraper V3

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Teste do Microserviço Proxy](#teste-do-microserviço-proxy)
3. [Teste do Workflow N8N](#teste-do-workflow-n8n)
4. [Validação End-to-End](#validação-end-to-end)
5. [Troubleshooting](#troubleshooting)
6. [Checklist de Produção](#checklist-de-produção)

---

## 🎯 Pré-requisitos

### Credenciais Necessárias

- [ ] **Telegram API** (obrigatório)
  - API ID
  - API Hash
  - Número de telefone
  - Fonte: https://my.telegram.org/apps

- [ ] **Gemini API** (obrigatório)
  - API Key
  - Fonte: https://aistudio.google.com/app/apikey

- [ ] **Supabase** (obrigatório)
  - URL do projeto
  - Anon Key
  - Fonte: https://supabase.com/dashboard

- [ ] **API Token** (obrigatório)
  - Gerar com: `openssl rand -hex 32`
  - Usar o mesmo valor em:
    - `API_TOKEN` no microserviço
    - `TELEGRAM_PROXY_TOKEN` no N8N

### Ferramentas

- [ ] Node.js >= 18.0.0
- [ ] npm ou pnpm
- [ ] Git
- [ ] cURL ou Postman (para testes)
- [ ] Acesso ao N8N

---

## 🔧 Teste do Microserviço Proxy

### Etapa 1: Configuração

```bash
cd /home/user/webapp/telegram-proxy-service

# Copiar arquivo de exemplo
cp .env.example .env

# Editar e preencher credenciais
nano .env
```

**Configuração mínima para primeiro teste:**
```env
TELEGRAM_API_ID=seu_api_id
TELEGRAM_API_HASH=seu_api_hash
TELEGRAM_PHONE=+55_seu_numero
API_TOKEN=token_gerado_com_openssl
NODE_ENV=development
```

### Etapa 2: Instalação

```bash
# Instalar dependências
npm install

# Verificar instalação
npm list telegram express dotenv
```

**Saída esperada:**
```
telegram-proxy-service@1.0.0
├── telegram@2.23.10
├── express@4.18.2
└── dotenv@16.3.1
```

### Etapa 3: Primeira Execução (Gerar Session)

```bash
# Iniciar o serviço
npm start
```

**O que vai acontecer:**
1. O servidor inicia na porta 3000
2. Telegram solicita código de autenticação
3. Você recebe SMS/Telegram com o código
4. Digite o código no terminal
5. **IMPORTANTE:** Copie a `SESSION_STRING` que aparece no console

**Exemplo de saída:**
```
======================================================================
⚠️  NEW SESSION STRING GENERATED
======================================================================
IMPORTANT: Save this to your .env file as TELEGRAM_SESSION:

TELEGRAM_SESSION=1AgAOMTQ5LjE1NC4xNjcuNDEBuwF...muito-longa

======================================================================
After saving, restart the service to use the persistent session.
======================================================================
```

### Etapa 4: Salvar Session e Reiniciar

```bash
# Parar o serviço (Ctrl+C)

# Editar .env e adicionar a SESSION_STRING
nano .env

# Reiniciar
npm start
```

**Saída esperada após reiniciar:**
```
╔═══════════════════════════════════════════════════════════╗
║         TELEGRAM PROXY MICROSERVICE                       ║
║         Running on port 3000                              ║
╚═══════════════════════════════════════════════════════════╝

✓ Telegram client connected
```

### Etapa 5: Teste de Health Check

```bash
curl http://localhost:3000/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T20:00:00.000Z",
  "telegram_connected": true,
  "connection_error": null,
  "uptime": 45.123,
  "memory": {
    "rss": 50000000,
    "heapTotal": 20000000,
    "heapUsed": 15000000
  }
}
```

✅ **Validação:** `telegram_connected` deve ser `true`

### Etapa 6: Teste de Scraping

```bash
curl -X POST http://localhost:3000/scrape-telegram \
  -H "Authorization: Bearer SEU_API_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["aicommunitybr"],
    "limit": 5
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "aicommunitybr_12345",
        "telegram_id": 12345,
        "content": "Mensagem de exemplo...",
        "channel": "aicommunitybr",
        "date": "2025-12-19T...",
        "sender_id": "123456789",
        "message_type": "text",
        "has_media": false,
        "is_prompt": true,
        "views": 100,
        "forwards": 5
      }
    ],
    "stats": {
      "total_messages": 5,
      "total_channels": 1,
      "total_prompts": 2
    }
  },
  "meta": {
    "request_id": "req_1234567890_abc123",
    "request_time": "2025-12-19T20:00:00.000Z",
    "processing_time_ms": 3500
  }
}
```

✅ **Validações:**
- `success` deve ser `true`
- `data.messages` deve conter array com mensagens
- `data.stats.total_messages` deve ser > 0
- `meta.processing_time_ms` deve ser < 30000 (30 segundos)

### Etapa 7: Teste de Erros

#### Teste 7.1: Token Inválido
```bash
curl -X POST http://localhost:3000/scrape-telegram \
  -H "Authorization: Bearer token-errado" \
  -H "Content-Type: application/json" \
  -d '{"channels": ["aicommunitybr"], "limit": 5}'
```

**Resposta esperada:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API token"
}
```
Status: 401

#### Teste 7.2: Canal Inválido
```bash
curl -X POST http://localhost:3000/scrape-telegram \
  -H "Authorization: Bearer SEU_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channels": ["canal_que_nao_existe_12345"], "limit": 5}'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "messages": [],
    "stats": {
      "total_messages": 0,
      "errors": [
        {
          "channel": "canal_que_nao_existe_12345",
          "error": "Cannot find entity..."
        }
      ]
    }
  }
}
```

✅ **Validação:** Erros são reportados mas não quebram a API

---

## 🔄 Teste do Workflow N8N

### Etapa 1: Importar Workflow

1. Acesse seu N8N: https://workflows.hospitalarsaude.com.br
2. Clique em "Workflows" > "Import from File"
3. Selecione: `/home/user/webapp/n8n-telegram-scraper-v3-improved.json`
4. Clique em "Import"

### Etapa 2: Configurar Variáveis de Ambiente

No N8N, vá em "Settings" > "Environments" e adicione:

```
TELEGRAM_PROXY_URL=http://seu-microservico.com:3000
TELEGRAM_PROXY_TOKEN=seu_api_token_aqui
TELEGRAM_CHANNELS=aicommunitybr,chatgptbrasil,aibrasiloficial
MESSAGES_PER_CHANNEL=100
GEMINI_API_KEY=sua_gemini_api_key
WEBHOOK_NOTIFICATION_URL=https://webhook.site/seu-webhook (opcional)
```

### Etapa 3: Configurar Credenciais Supabase

1. No workflow, clique no nó "Supabase - Salvar Dados"
2. Clique em "Credentials" > "Create New"
3. Preencha:
   - **Name:** Supabase Educacional
   - **Host:** sua_url_supabase (sem https://)
   - **Service Role Secret:** sua_service_role_key

### Etapa 4: Teste Manual

1. Clique em "Execute Workflow" (botão play no canto superior direito)
2. Acompanhe a execução de cada nó

**Validações por nó:**

| Nó | Validação | O que verificar |
|----|-----------|-----------------|
| **Schedule Trigger** | ✅ Disparado | Timestamp correto |
| **Telegram Scraper API** | ✅ 200 OK | `success: true` na resposta |
| **Extract Messages** | ✅ Mensagens extraídas | Array com mensagens válidas |
| **Split In Batches** | ✅ Lotes criados | Batches de 10 mensagens |
| **Classificador IA** | ✅ Classificação OK | `classification` presente |
| **Análise de Sentimento** | ✅ Sentimento OK | `urgency_score`, `sentiment`, `priority` |
| **Extrator de Conteúdo** | ✅ Resumo gerado | `summary` e `key_points` |
| **Supabase - Salvar Dados** | ✅ Dados salvos | Sem erros |
| **IF - Verificar Erros** | ✅ Roteamento correto | Vai para sucesso ou erro |

### Etapa 5: Verificar Logs

Clique em cada nó para ver os logs detalhados:

```
[Extract Messages] Processing API response...
[Extract Messages] ✓ Received 50 messages from API
[Extract Messages]   Total channels: 1
[Extract Messages]   Total prompts: 15
[Extract Messages] ✓ Validated 50/50 messages

[Classificador] Tentativa 1/3 para mensagem aicommunitybr_12345
[Classificador] ✓ Classified as: prompt (confidence: 0.85)

[Sentimento] Tentativa 1/3 para mensagem aicommunitybr_12345
[Sentimento] ✓ Analyzed: urgency=7, sentiment=informativo

[Extrator] Mensagem aicommunitybr_12345 não precisa de resumo (350 chars)
```

### Etapa 6: Validar Dados no Supabase

1. Acesse seu Supabase: https://supabase.com/dashboard
2. Vá em "Table Editor" > "messages"
3. Verifique:
   - ✅ Mensagens foram inseridas
   - ✅ Campos preenchidos corretamente
   - ✅ Timestamps corretos
   - ✅ Classificações presentes

**Query SQL para validação:**
```sql
SELECT 
  COUNT(*) as total_messages,
  COUNT(DISTINCT channel) as total_channels,
  classification,
  priority,
  AVG(urgency_score) as avg_urgency
FROM messages
WHERE scraped_at >= NOW() - INTERVAL '1 hour'
GROUP BY classification, priority
ORDER BY total_messages DESC;
```

---

## 🔗 Validação End-to-End

### Cenário Completo

1. **Microserviço rodando** ✅
2. **Workflow N8N ativo** ✅
3. **Supabase configurado** ✅

### Teste Automático

```bash
# Executar workflow via API do N8N
curl -X POST https://workflows.hospitalarsaude.com.br/webhook/test-telegram-scraper \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Monitoramento Contínuo

**Script de monitoramento (salvar como `monitor.sh`):**
```bash
#!/bin/bash

echo "🔍 Monitorando Telegram Scraper..."

while true; do
  # Health check do microserviço
  HEALTH=$(curl -s http://localhost:3000/health | jq -r '.telegram_connected')
  
  if [ "$HEALTH" = "true" ]; then
    echo "✅ $(date): Microserviço OK"
  else
    echo "❌ $(date): Microserviço com problema!"
  fi
  
  sleep 300  # 5 minutos
done
```

---

## 🔧 Troubleshooting

### Problema 1: "Phone code requested" no Microserviço

**Causa:** TELEGRAM_SESSION não configurado ou inválido

**Solução:**
1. Parar o serviço
2. Remover `TELEGRAM_SESSION` do `.env`
3. Reiniciar em modo development
4. Inserir código do Telegram
5. Copiar nova SESSION_STRING
6. Atualizar `.env`
7. Reiniciar

### Problema 2: "Unauthorized" no N8N

**Causa:** Token incorreto

**Solução:**
1. Verificar `API_TOKEN` no microserviço
2. Verificar `TELEGRAM_PROXY_TOKEN` no N8N
3. Devem ser **idênticos**
4. Regenerar se necessário: `openssl rand -hex 32`

### Problema 3: "telegram_connected: false"

**Causa:** Cliente Telegram não conectou

**Solução:**
1. Verificar logs do microserviço
2. Verificar credenciais TELEGRAM_API_ID e TELEGRAM_API_HASH
3. Verificar TELEGRAM_SESSION
4. Reiniciar o serviço

### Problema 4: Gemini API retorna erro 429

**Causa:** Rate limit excedido

**Solução:**
1. O workflow já tem retry automático
2. Aguardar 1 minuto
3. Reduzir `MESSAGES_PER_CHANNEL` para 50
4. Aumentar intervalo do Schedule Trigger

### Problema 5: Supabase "Row not found"

**Causa:** Tabela `messages` não existe

**Solução:**
```sql
-- Executar no Supabase SQL Editor
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  telegram_id BIGINT,
  content TEXT,
  channel TEXT,
  date TIMESTAMP WITH TIME ZONE,
  sender_id TEXT,
  sender_name TEXT,
  message_type TEXT,
  has_media BOOLEAN,
  is_prompt BOOLEAN,
  views INTEGER,
  forwards INTEGER,
  classification TEXT,
  classification_confidence FLOAT,
  classification_reasoning TEXT,
  urgency_score INTEGER,
  sentiment TEXT,
  priority TEXT,
  sentiment_reasoning TEXT,
  sentiment_keywords JSONB,
  summary TEXT,
  key_points JSONB,
  word_count INTEGER,
  scraped_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_messages_channel ON messages(channel);
CREATE INDEX idx_messages_date ON messages(date DESC);
CREATE INDEX idx_messages_classification ON messages(classification);
```

---

## ✅ Checklist de Produção

### Microserviço

- [ ] `TELEGRAM_SESSION` configurado e testado
- [ ] `API_TOKEN` forte e seguro (32+ caracteres)
- [ ] `NODE_ENV=production`
- [ ] Rate limiting configurado
- [ ] Deploy em servidor confiável (Render/Railway/VPS)
- [ ] HTTPS habilitado
- [ ] Monitoramento ativo (UptimeRobot, etc.)
- [ ] Logs sendo coletados

### N8N Workflow

- [ ] Todas as variáveis de ambiente configuradas
- [ ] Credenciais Supabase válidas
- [ ] Gemini API Key válida com quota
- [ ] Schedule configurado (recomendado: 6 horas)
- [ ] Webhook de notificação configurado (opcional)
- [ ] Workflow ativado
- [ ] Teste manual executado com sucesso

### Supabase

- [ ] Tabela `messages` criada
- [ ] Índices criados para performance
- [ ] Row Level Security (RLS) configurado (opcional)
- [ ] Backup automático habilitado
- [ ] Quota de armazenamento monitorada

### Validação Final

- [ ] Executar workflow manualmente - **SUCESSO**
- [ ] Verificar dados no Supabase - **DADOS PRESENTES**
- [ ] Verificar logs sem erros - **SEM ERROS CRÍTICOS**
- [ ] Aguardar execução automática - **EXECUTOU AUTOMATICAMENTE**
- [ ] Monitorar por 24h - **ESTÁVEL**

---

## 📊 Métricas de Sucesso

Após 24 horas de operação, você deve ter:

- ✅ **Taxa de sucesso:** > 95% das execuções
- ✅ **Mensagens coletadas:** > 1000 (depende do número de canais)
- ✅ **Classificações válidas:** > 90% com confidence > 0.5
- ✅ **Tempo de processamento:** < 5 minutos por execução
- ✅ **Erros:** < 5% das mensagens com erro

---

## 🎉 Conclusão

Se você passou por todos os testes acima e todos estão ✅, seu sistema está **100% funcional e pronto para produção!**

**Próximos passos:**
1. Configurar monitoramento contínuo
2. Criar alertas para falhas
3. Documentar canais adicionados
4. Configurar backups regulares
5. Revisar e otimizar canais com base nos dados coletados

---

**Data:** 2025-12-19  
**Versão:** 3.0  
**Autor:** Telegram Scraper Team
