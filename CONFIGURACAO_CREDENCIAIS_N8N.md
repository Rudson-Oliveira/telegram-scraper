# 🔐 Guia Completo de Configuração de Credenciais N8N

## ⚠️ Erro Atual: "Credenciais não encontradas"

Este erro ocorre porque o nó **"API de raspagem do Telegram"** precisa de:
1. **URL do microserviço proxy** (rodando)
2. **Token de autenticação** (Bearer token)
3. **Variáveis de ambiente configuradas no N8N**

---

## 📋 O QUE VOCÊ PRECISA CONFIGURAR

### 1️⃣ **Microserviço Proxy do Telegram** (OBRIGATÓRIO)

O workflow N8N V3 **NÃO** se conecta diretamente ao Telegram. Ele usa um **microserviço proxy**.

#### **Por quê?**
- N8N bloqueia módulos como `telegram` por questões de segurança
- O proxy faz a raspagem e retorna os dados via HTTP/REST API

#### **Onde está o código?**
```
telegram-proxy-service/
├── server.js          ← Código do microserviço
├── .env.example       ← Modelo de configuração
├── QUICK_START.md     ← Guia de instalação
└── test-improved.js   ← Suite de testes
```

---

### 2️⃣ **Credenciais do Telegram** (para o Microserviço)

**Você precisa obter no Telegram:**

#### **Passo 1: Obter API ID e Hash**
1. Acesse: **https://my.telegram.org/apps**
2. Faça login com seu número de telefone
3. Clique em **"API development tools"**
4. Preencha o formulário:
   - **App title**: `N8N Scraper`
   - **Short name**: `n8nscraper`
   - **Platform**: `Other`
5. Copie os valores:
   - `api_id` → será seu `TELEGRAM_API_ID`
   - `api_hash` → será seu `TELEGRAM_API_HASH`

#### **Passo 2: Configurar Telefone**
- Use o mesmo número de telefone da sua conta Telegram
- Formato internacional: `+5511999999999` (Brasil)

#### **Passo 3: Sessão do Telegram**
- Na **primeira execução**, o microserviço vai gerar uma sessão
- Você vai precisar inserir o código de verificação enviado pelo Telegram
- A sessão será salva e reutilizada (não precisa fazer login toda vez)

---

### 3️⃣ **Token de Autenticação** (para o Microserviço + N8N)

**Você precisa gerar um token seguro:**

```bash
# No terminal Linux/Mac:
openssl rand -hex 32

# Ou use um gerador online:
# https://generate-random.org/api-token-generator
```

**Exemplo de token gerado:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**IMPORTANTE:**
- Use o **MESMO TOKEN** em dois lugares:
  1. No microserviço: `API_TOKEN=seu-token-aqui`
  2. No N8N: `TELEGRAM_PROXY_TOKEN=seu-token-aqui`

---

## 🛠️ CONFIGURAÇÃO PASSO A PASSO

### **PARTE 1: Configurar o Microserviço**

#### **1. Criar arquivo `.env`**

```bash
cd /home/user/webapp/telegram-proxy-service
cp .env.example .env
nano .env  # ou vim, ou qualquer editor
```

#### **2. Preencher o `.env`**

```bash
# ========================================
# 1. CREDENCIAIS DO TELEGRAM
# ========================================
TELEGRAM_API_ID=12345678                          # Obtenha em https://my.telegram.org/apps
TELEGRAM_API_HASH=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5  # Obtenha em https://my.telegram.org/apps
TELEGRAM_PHONE=+5511999999999                     # Seu número de telefone (formato internacional)

# Sessão (deixe vazio na primeira execução)
TELEGRAM_SESSION=                                  # Será gerado automaticamente

# ========================================
# 2. SEGURANÇA (TOKEN DE AUTENTICAÇÃO)
# ========================================
API_TOKEN=seu-token-super-secreto-aqui            # Gere com: openssl rand -hex 32

# ========================================
# 3. CONFIGURAÇÕES DO SERVIDOR
# ========================================
PORT=3000                                          # Porta do microserviço
NODE_ENV=production                                # Modo de execução

# ========================================
# 4. RATE LIMITING
# ========================================
RATE_LIMIT_MAX=30                                  # 30 requisições por minuto
RATE_LIMIT_WINDOW_MS=60000                         # Janela de 1 minuto
```

#### **3. Instalar dependências**

```bash
cd /home/user/webapp/telegram-proxy-service
npm install
```

#### **4. Iniciar o microserviço**

**Opção A: Primeiro login (precisa do código do Telegram)**
```bash
cd /home/user/webapp/telegram-proxy-service
node server.js
```

**O que vai acontecer:**
1. O microserviço vai iniciar
2. Vai pedir o **código de verificação** enviado pelo Telegram
3. Digite o código
4. A sessão será salva

**Opção B: Com sessão salva (execução normal)**
```bash
cd /home/user/webapp/telegram-proxy-service
npm start
```

#### **5. Verificar se está rodando**

```bash
# Em outro terminal:
curl http://localhost:3000/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "telegram_connected": true,
  "version": "2.0.0",
  "timestamp": "2025-12-20T12:00:00.000Z"
}
```

---

### **PARTE 2: Configurar o N8N**

#### **1. Configurar Variáveis de Ambiente**

**No N8N Cloud:**
1. Acesse: `https://workflows.hospitalarsaude.com.br`
2. Vá em: **Settings → Environments**
3. Adicione as seguintes variáveis:

```bash
# URL do Microserviço
TELEGRAM_PROXY_URL=http://localhost:3000
# Se o microserviço estiver em nuvem (ex: Render.com):
# TELEGRAM_PROXY_URL=https://seu-app.onrender.com

# Token de Autenticação (O MESMO do microserviço)
TELEGRAM_PROXY_TOKEN=seu-token-super-secreto-aqui

# Canais para raspar (separados por vírgula)
TELEGRAM_CHANNELS=aicommunitybr,chatgptbrasil,tecnoblog

# Quantidade de mensagens por canal
MESSAGES_PER_CHANNEL=100

# API Key do Gemini (para análise de IA)
GEMINI_API_KEY=sua-chave-api-do-gemini
# Obtenha em: https://aistudio.google.com/app/apikey

# URL do Webhook (para notificações)
WEBHOOK_NOTIFICATION_URL=https://webhook.site/seu-webhook-url
```

#### **2. Configurar Credenciais do Supabase**

**No N8N:**
1. Vá em: **Credentials → Add Credential**
2. Escolha: **Supabase**
3. Preencha:
   - **Name**: `Supabase Educacional`
   - **Host**: `sua-url.supabase.co`
   - **API Key (anon)**: `sua-anon-key`
   - **Service Role Key**: `sua-service-role-key` (opcional)

**Onde obter as credenciais do Supabase:**
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: **Settings → API**
4. Copie:
   - `Project URL` → será o **Host** (sem `https://`)
   - `anon public` → será a **API Key**

#### **3. Ativar o Workflow**

1. Importe o workflow V3 (já feito ✅)
2. Verifique se as variáveis foram carregadas
3. Clique em **"Execute Workflow"** (teste manual)
4. Se funcionar, ative o **Schedule Trigger**

---

### **PARTE 3: Configurar o Supabase**

#### **1. Criar Tabela de Mensagens**

Execute este SQL no Supabase:

```sql
-- Criar tabela de mensagens
CREATE TABLE telegram_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel VARCHAR(255) NOT NULL,
    message_id BIGINT NOT NULL,
    message_text TEXT,
    sender VARCHAR(255),
    date TIMESTAMP WITH TIME ZONE,
    
    -- Campos de análise de IA
    category VARCHAR(100),
    sentiment VARCHAR(50),
    sentiment_score FLOAT,
    keywords TEXT[],
    summary TEXT,
    
    -- Metadados
    request_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para performance
    UNIQUE(channel, message_id)
);

-- Criar índices
CREATE INDEX idx_channel ON telegram_messages(channel);
CREATE INDEX idx_date ON telegram_messages(date);
CREATE INDEX idx_category ON telegram_messages(category);
CREATE INDEX idx_sentiment ON telegram_messages(sentiment);

-- Habilitar Row Level Security (RLS)
ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso (permitir inserção com service role)
CREATE POLICY "Enable insert for service role" 
ON telegram_messages 
FOR INSERT 
WITH CHECK (true);

-- Criar política de leitura (permitir leitura para todos autenticados)
CREATE POLICY "Enable read access for all users" 
ON telegram_messages 
FOR SELECT 
USING (true);
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### **Microserviço**
- [ ] `.env` criado e preenchido
- [ ] `npm install` executado
- [ ] Microserviço iniciado (`node server.js`)
- [ ] Login no Telegram feito (primeira vez)
- [ ] Health check retorna `telegram_connected: true`

### **N8N**
- [ ] Variáveis de ambiente configuradas (4 obrigatórias)
- [ ] Credenciais do Supabase criadas
- [ ] Workflow V3 importado
- [ ] Teste manual executado com sucesso

### **Supabase**
- [ ] Tabela `telegram_messages` criada
- [ ] Índices criados
- [ ] RLS habilitado
- [ ] Credenciais copiadas para o N8N

---

## 🐛 TROUBLESHOOTING

### **Erro: "Credenciais não encontradas"**
- **Causa**: `TELEGRAM_PROXY_URL` ou `TELEGRAM_PROXY_TOKEN` não configurados no N8N
- **Solução**: Vá em N8N → Settings → Environments e adicione as variáveis

### **Erro: "401 Unauthorized"**
- **Causa**: Token diferente entre microserviço e N8N
- **Solução**: Use o **MESMO TOKEN** em `API_TOKEN` (microserviço) e `TELEGRAM_PROXY_TOKEN` (N8N)

### **Erro: "telegram_connected: false"**
- **Causa**: Sessão do Telegram expirada ou inválida
- **Solução**: Delete `TELEGRAM_SESSION` do `.env` e faça login novamente

### **Erro: "ECONNREFUSED"**
- **Causa**: Microserviço não está rodando
- **Solução**: Inicie o microserviço com `node server.js`

### **Erro: "Invalid JSON"**
- **Causa**: Resposta da API do Gemini malformada
- **Solução**: O workflow V3 já tem fallback automático, verifique os logs

---

## 📚 DOCUMENTAÇÃO ADICIONAL

- **Guia de Teste N8N**: `GUIA_TESTE_N8N.md`
- **Validação de Testes**: `TESTE_VALIDACAO.md`
- **Relatório de Avaliação**: `RELATORIO_AVALIACAO.md` (Nota 5/5)
- **Quick Start Microserviço**: `telegram-proxy-service/QUICK_START.md`

---

## 🎯 PRÓXIMOS PASSOS

1. **Configure o microserviço** (PARTE 1)
2. **Configure o N8N** (PARTE 2)
3. **Configure o Supabase** (PARTE 3)
4. **Execute um teste manual** no N8N
5. **Ative o Schedule Trigger** (automação)

---

## 📞 SUPORTE

Se continuar com problemas:
1. Verifique os logs do microserviço: `cd telegram-proxy-service && node server.js`
2. Verifique os logs do N8N: Execution → View Logs
3. Consulte: `TESTE_VALIDACAO.md` → Seção 7 (Troubleshooting)

---

**Status**: Workflow V3 corrigido ✅ | Microserviço pronto ✅ | Documentação completa ✅

**Última atualização**: 2025-12-20
