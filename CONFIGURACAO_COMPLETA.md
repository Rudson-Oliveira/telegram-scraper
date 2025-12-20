# 🔧 GUIA DE CONFIGURAÇÃO - TELEGRAM SCRAPER V3

**Status:** Workflow Importado ✅  
**Próximo Passo:** Configurar Credenciais e Variáveis

---

## 🎯 CONFIGURAÇÃO COMPLETA EM 3 PASSOS

---

## 1️⃣ VARIÁVEIS DE AMBIENTE DO N8N

### Como Acessar:
1. No N8N, vá em: **Settings** (⚙️ no menu lateral)
2. Clique em: **Environments** ou **Variables**
3. Adicione as variáveis abaixo

### Variáveis Obrigatórias:

```bash
# ============================================
# MICROSERVIÇO TELEGRAM PROXY
# ============================================

# URL do microserviço (escolha uma opção):

# Opção A: Localhost (para teste rápido)
TELEGRAM_PROXY_URL=http://localhost:3000

# Opção B: Cloud (após deploy)
# TELEGRAM_PROXY_URL=https://seu-app.render.com
# TELEGRAM_PROXY_URL=https://seu-app.railway.app

# Token de autenticação (IMPORTANTE: usar o mesmo do microserviço)
# Gerar: openssl rand -hex 32
TELEGRAM_PROXY_TOKEN=cole_aqui_o_token_gerado

# ============================================
# CANAIS DO TELEGRAM
# ============================================

# Canais para raspar (separados por vírgula, SEM espaços extras)
TELEGRAM_CHANNELS=aicommunitybr,chatgptbrasil,aibrasiloficial

# Quantidade de mensagens por canal
MESSAGES_PER_CHANNEL=100

# ============================================
# GEMINI API (Para IA)
# ============================================

# API Key do Gemini
# Obter em: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=cole_aqui_sua_gemini_api_key

# ============================================
# WEBHOOK DE NOTIFICAÇÃO (Opcional)
# ============================================

# URL para receber notificações (pode deixar vazio por enquanto)
WEBHOOK_NOTIFICATION_URL=https://webhook.site/seu-webhook
```

### 📝 Como Preencher:

**1. TELEGRAM_PROXY_URL:**
   - Se está testando localmente: `http://localhost:3000`
   - Se já fez deploy: URL do seu serviço na cloud

**2. TELEGRAM_PROXY_TOKEN:**
   ```bash
   # No terminal, gere um token:
   openssl rand -hex 32
   
   # Exemplo de saída:
   # 8f7d6e5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7
   
   # Cole este token em ambos os lugares:
   # - Aqui no N8N (TELEGRAM_PROXY_TOKEN)
   # - No microserviço (.env como API_TOKEN)
   ```

**3. TELEGRAM_CHANNELS:**
   - Usernames dos canais (sem @)
   - Separados por vírgula
   - Exemplo: `aicommunitybr,chatgptbrasil,aibrasiloficial`

**4. GEMINI_API_KEY:**
   - Acesse: https://aistudio.google.com/app/apikey
   - Clique em "Create API Key"
   - Copie a chave gerada

---

## 2️⃣ CREDENCIAIS DO SUPABASE

### No Workflow N8N:

1. **Abra o workflow** "Telegram Scraper V3"
2. **Clique no node:** "Supabase - Salvar Dados"
3. **Clique em:** "Credentials" (🔑 no canto superior do node)
4. **Clique em:** "Create New"
5. **Selecione:** "Supabase API"

### Preencha os Campos:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CREDENTIAL NAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Supabase Educacional

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 HOST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
seu-projeto.supabase.co

⚠️ IMPORTANTE: SEM https:// e SEM barra no final
❌ Errado: https://seu-projeto.supabase.co/
✅ Correto: seu-projeto.supabase.co

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SERVICE ROLE SECRET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

⚠️ IMPORTANTE: Use SERVICE_ROLE (não ANON key)
```

### 🔍 Onde Encontrar as Credenciais Supabase:

1. **Acesse:** https://supabase.com/dashboard
2. **Selecione seu projeto** (ou crie um novo)
3. **Vá em:** Settings (⚙️) > API
4. **Copie:**
   - **Project URL:** `https://seu-projeto.supabase.co`
     - Use apenas: `seu-projeto.supabase.co` (sem https://)
   - **service_role (secret):** A chave longa que começa com `eyJ...`
     - ⚠️ NÃO use a `anon public` key!

### 🗄️ Criar Tabela no Supabase (Se ainda não existe):

**Execute no SQL Editor do Supabase:**

```sql
-- Criar tabela messages
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
  updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_classification ON messages(classification);
CREATE INDEX IF NOT EXISTS idx_messages_priority ON messages(priority);
CREATE INDEX IF NOT EXISTS idx_messages_scraped_at ON messages(scraped_at DESC);

-- Verificar se a tabela foi criada
SELECT COUNT(*) FROM messages;
```

**Resultado esperado:** `0` (tabela vazia criada com sucesso)

---

## 3️⃣ MICROSERVIÇO TELEGRAM PROXY

### ⚠️ O MICROSERVIÇO PRECISA ESTAR RODANDO!

O workflow N8N chama o microserviço para raspar o Telegram.

### Opção A: Rodar Localmente (Teste Rápido)

```bash
# 1. Ir para o diretório
cd /caminho/para/telegram-scraper/telegram-proxy-service

# 2. Copiar template
cp .env.example .env

# 3. Editar o .env
nano .env  # ou usar seu editor preferido

# 4. Preencher as credenciais (veja abaixo)

# 5. Instalar dependências
npm install

# 6. Iniciar o servidor
npm start
```

### 📝 Arquivo .env do Microserviço:

```bash
# ============================================
# TELEGRAM API CREDENTIALS
# ============================================

# Obter em: https://my.telegram.org/apps
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
TELEGRAM_PHONE=+5535998352323

# ============================================
# TELEGRAM SESSION (Opcional mas RECOMENDADO)
# ============================================

# Deixe vazio na primeira execução
# Após primeira execução, copie a SESSION_STRING dos logs e cole aqui
TELEGRAM_SESSION=

# ============================================
# API TOKEN (IMPORTANTE!)
# ============================================

# Use o MESMO token que você configurou no N8N
# Gerar: openssl rand -hex 32
API_TOKEN=8f7d6e5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7

# ============================================
# ENVIRONMENT
# ============================================

NODE_ENV=development
PORT=3000
```

### 🔑 Como Obter Credenciais do Telegram:

**1. Acesse:** https://my.telegram.org/apps

**2. Faça login** com seu número de telefone

**3. Vá em:** "API development tools"

**4. Crie um novo aplicativo:**
   - App title: `N8N Telegram Scraper`
   - Short name: `n8n-scraper`
   - URL: (pode deixar vazio)
   - Platform: `Other`

**5. Copie:**
   - **api_id:** Número (ex: 12345678)
   - **api_hash:** String longa (ex: abcdef1234567890...)

### 🚀 Primeira Execução (Gerar Session):

```bash
# Iniciar o servidor
npm start

# Você verá:
# "Phone code requested"

# 1. Você vai receber um código no Telegram
# 2. Digite o código no terminal
# 3. O servidor vai conectar
# 4. Você verá nos logs:

╔══════════════════════════════════════════╗
║ NEW SESSION STRING GENERATED             ║
╔══════════════════════════════════════════╗

TELEGRAM_SESSION=1AgAOMTQ5LjE1NC4xNjcuNDEBuwF...muito-longa

# 5. COPIE esta SESSION_STRING
# 6. Cole no .env como TELEGRAM_SESSION
# 7. Reinicie o servidor

# Nas próximas execuções, não pedirá código!
```

### ✅ Verificar se o Microserviço está Rodando:

```bash
# Testar health check
curl http://localhost:3000/health

# Resposta esperada:
{
  "status": "ok",
  "timestamp": "2025-12-19T...",
  "telegram_connected": true,  ← IMPORTANTE: deve ser true
  "uptime": 45.123
}
```

**Se `telegram_connected: true`** → ✅ Tudo OK!
**Se `telegram_connected: false`** → ⚠️ Configurar SESSION_STRING

---

## ✅ CHECKLIST DE CONFIGURAÇÃO

Antes de executar o workflow, confirme:

### N8N - Variáveis de Ambiente:
- [ ] `TELEGRAM_PROXY_URL` configurado
- [ ] `TELEGRAM_PROXY_TOKEN` configurado (mesmo do microserviço)
- [ ] `TELEGRAM_CHANNELS` configurado
- [ ] `MESSAGES_PER_CHANNEL` configurado (ex: 100)
- [ ] `GEMINI_API_KEY` configurado

### N8N - Credenciais Supabase:
- [ ] Credential criado: "Supabase Educacional"
- [ ] Host configurado (sem https://)
- [ ] Service Role Secret configurado
- [ ] Tabela `messages` criada no Supabase

### Microserviço:
- [ ] Arquivo `.env` criado e preenchido
- [ ] `TELEGRAM_API_ID` configurado
- [ ] `TELEGRAM_API_HASH` configurado
- [ ] `TELEGRAM_PHONE` configurado
- [ ] `API_TOKEN` configurado (mesmo do N8N)
- [ ] `TELEGRAM_SESSION` configurado (após primeira execução)
- [ ] Servidor rodando (`npm start`)
- [ ] Health check retornando `telegram_connected: true`

---

## 🧪 EXECUTAR TESTE

### No N8N:

1. **Abra o workflow** "Telegram Scraper V3"
2. **Clique em:** "Execute Workflow" (▶️ no canto superior direito)
3. **Aguarde a execução** (~3-5 minutos)

### Verificar Cada Node:

**✅ Schedule Trigger:**
- Status: Executado
- Output: Timestamp

**✅ Telegram Scraper API:**
- Status: 200 OK
- Output: `{ "success": true, "data": { "messages": [...] } }`

**✅ Extract Messages:**
- Output: Array de mensagens
- Log: "✓ Received X messages from API"

**✅ Classificador IA:**
- Output: Mensagens com `classification`
- Log: "✓ Classified as: prompt"

**✅ Análise de Sentimento:**
- Output: Mensagens com `urgency_score`, `sentiment`
- Log: "✓ Analyzed: urgency=7"

**✅ Supabase - Salvar Dados:**
- Status: Dados salvos
- Verificar no Supabase

---

## 🔍 VALIDAR DADOS NO SUPABASE

### No Supabase:

1. Vá em: **Table Editor** > **messages**
2. Verifique se há registros

### Query SQL para validar:

```sql
-- Ver últimas mensagens inseridas
SELECT 
  id,
  channel,
  classification,
  priority,
  urgency_score,
  scraped_at
FROM messages
ORDER BY scraped_at DESC
LIMIT 10;

-- Estatísticas
SELECT 
  COUNT(*) as total,
  classification,
  priority,
  AVG(urgency_score) as avg_urgency
FROM messages
WHERE scraped_at >= NOW() - INTERVAL '1 hour'
GROUP BY classification, priority;
```

---

## 🆘 TROUBLESHOOTING

### Erro: "Cannot connect to microservice"
**Solução:**
- Verificar se microserviço está rodando
- Testar: `curl http://localhost:3000/health`
- Verificar `TELEGRAM_PROXY_URL` no N8N

### Erro: "Unauthorized"
**Solução:**
- Verificar se `API_TOKEN` (microserviço) = `TELEGRAM_PROXY_TOKEN` (N8N)
- Devem ser IDÊNTICOS

### Erro: "telegram_connected: false"
**Solução:**
- Configurar `TELEGRAM_SESSION` no .env
- Seguir processo de primeira execução

### Erro: "GEMINI_API_KEY not configured"
**Solução:**
- Adicionar `GEMINI_API_KEY` nas variáveis de ambiente do N8N
- Obter em: https://aistudio.google.com/app/apikey

### Erro: "Table 'messages' does not exist"
**Solução:**
- Executar SQL de criação da tabela no Supabase (ver seção 2)

---

## 📞 RECURSOS ADICIONAIS

### Documentação:
- 📄 **TESTE_VALIDACAO.md** - Guia completo de teste
- 📄 **GUIA_TESTE_N8N.md** - Guia rápido N8N
- 📄 **telegram-proxy-service/README.md** - Doc do microserviço

### GitHub:
https://github.com/Rudson-Oliveira/telegram-scraper

---

## ✅ RESUMO RÁPIDO

### 3 Passos Essenciais:

1. **N8N - Variáveis de Ambiente**
   - TELEGRAM_PROXY_URL
   - TELEGRAM_PROXY_TOKEN
   - TELEGRAM_CHANNELS
   - GEMINI_API_KEY

2. **N8N - Credenciais Supabase**
   - Host (sem https://)
   - Service Role Secret

3. **Microserviço Rodando**
   - .env configurado
   - npm start
   - Health check OK

---

**Data:** 2025-12-19  
**Status:** Aguardando Configuração  
**Próximo Passo:** Configurar e Testar

🚀 **BOA SORTE!** 🚀
