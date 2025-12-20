# 🎯 Guia Visual - Configuração N8N

## 📍 ONDE CONFIGURAR NO N8N

### **1. Variáveis de Ambiente** (Settings → Environments)

```
┌─────────────────────────────────────────────────────────┐
│  N8N - Environment Variables                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Variable Name: TELEGRAM_PROXY_URL                      │
│  Value: http://localhost:3000                           │
│  [Save]                                                  │
│                                                          │
│  Variable Name: TELEGRAM_PROXY_TOKEN                    │
│  Value: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0...     │
│  [Save]                                                  │
│                                                          │
│  Variable Name: TELEGRAM_CHANNELS                       │
│  Value: aicommunitybr,chatgptbrasil,tecnoblog          │
│  [Save]                                                  │
│                                                          │
│  Variable Name: MESSAGES_PER_CHANNEL                    │
│  Value: 100                                             │
│  [Save]                                                  │
│                                                          │
│  Variable Name: GEMINI_API_KEY                          │
│  Value: AIzaSyD...                                      │
│  [Save]                                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### **2. Credenciais do Supabase** (Credentials → Add Credential)

```
┌─────────────────────────────────────────────────────────┐
│  N8N - Create Credential: Supabase                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Credential Name: Supabase Educacional                  │
│  ───────────────────────────────────────────────        │
│                                                          │
│  Host: sua-url.supabase.co                              │
│  ───────────────────────────────────────────────        │
│  (não inclua https://)                                   │
│                                                          │
│  API Key (anon):                                        │
│  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJz...  │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  Service Role Key (optional):                           │
│  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJz...  │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  [Test Connection]  [Save]                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 FLUXO DE CONFIGURAÇÃO

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  1️⃣  TELEGRAM API                                           │
│     https://my.telegram.org/apps                            │
│     ├── API ID      → .env do microserviço                  │
│     └── API Hash    → .env do microserviço                  │
│                                                              │
│  2️⃣  GERAR TOKEN                                            │
│     openssl rand -hex 32                                    │
│     ├── API_TOKEN              → .env do microserviço       │
│     └── TELEGRAM_PROXY_TOKEN   → N8N Environment Variables  │
│         ⚠️  DEVEM SER IGUAIS                                │
│                                                              │
│  3️⃣  GEMINI API                                             │
│     https://aistudio.google.com/app/apikey                  │
│     └── GEMINI_API_KEY → N8N Environment Variables          │
│                                                              │
│  4️⃣  SUPABASE                                               │
│     https://supabase.com/dashboard                          │
│     ├── Project URL  → N8N Credentials (Supabase)           │
│     └── Anon Key     → N8N Credentials (Supabase)           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔍 VALIDAÇÃO VISUAL

### **Microserviço Rodando**

```bash
$ curl http://localhost:3000/health
```

**✅ Resposta Esperada:**
```json
{
  "status": "ok",
  "telegram_connected": true,
  "version": "2.0.0",
  "timestamp": "2025-12-20T12:00:00.000Z",
  "uptime": 123.45
}
```

**❌ Se telegram_connected = false:**
```json
{
  "status": "ok",
  "telegram_connected": false,  ← PROBLEMA!
  "version": "2.0.0"
}
```
**Solução**: Delete `TELEGRAM_SESSION` do `.env` e reinicie o servidor

---

### **Workflow N8N Executado**

```
┌─────────────────────────────────────────────────────────┐
│  Telegram Scraper V3 - Production (IMPROVED)            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ Schedule Trigger                                     │
│  ✅ Configuração Inicial                                │
│  ✅ API de raspagem do Telegram                         │
│  ✅ Extrair Mensagens                                   │
│  ✅ Classificador IA                                    │
│  ✅ Análise de Sentimento                               │
│  ✅ Extrator de Conteúdo                                │
│  ✅ Supabase - Salvar Dados                             │
│  ✅ Notificação de Sucesso                              │
│                                                          │
│  Execution Time: 3m 42s                                  │
│  Messages Processed: 200                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ ERROS COMUNS E SOLUÇÕES

### **Erro 1: "Credenciais não encontradas"**

```
┌─────────────────────────────────────────────────────────┐
│  ❌ API de raspagem do Telegram                         │
│                                                          │
│  NodeApiError: Credenciais não encontradas              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Causa**: Variáveis de ambiente não configuradas no N8N

**Solução**:
1. N8N → Settings → Environments
2. Adicionar:
   - `TELEGRAM_PROXY_URL`
   - `TELEGRAM_PROXY_TOKEN`

---

### **Erro 2: "401 Unauthorized"**

```
┌─────────────────────────────────────────────────────────┐
│  ❌ API de raspagem do Telegram                         │
│                                                          │
│  Error 401: Unauthorized                                │
│  Token inválido ou ausente                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Causa**: Tokens diferentes no microserviço e N8N

**Solução**:
```bash
# Microserviço (.env)
API_TOKEN=a1b2c3d4...

# N8N (Environment Variables)
TELEGRAM_PROXY_TOKEN=a1b2c3d4...  ← DEVEM SER IGUAIS!
```

---

### **Erro 3: "ECONNREFUSED"**

```
┌─────────────────────────────────────────────────────────┐
│  ❌ API de raspagem do Telegram                         │
│                                                          │
│  Error: connect ECONNREFUSED 127.0.0.1:3000             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Causa**: Microserviço não está rodando

**Solução**:
```bash
cd telegram-proxy-service
node server.js
```

---

### **Erro 4: "Invalid JSON response"**

```
┌─────────────────────────────────────────────────────────┐
│  ⚠️  Classificador IA                                   │
│                                                          │
│  Fallback ativado: resposta JSON inválida              │
│  Retornando categoria padrão: "geral"                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Causa**: API do Gemini retornou texto ao invés de JSON

**Situação**: ✅ NORMAL - Workflow V3 tem fallback automático

---

## 📝 CHECKLIST DE CONFIGURAÇÃO

### **Microserviço**
- [ ] `.env` criado (copiar de `.env.example`)
- [ ] `TELEGRAM_API_ID` preenchido
- [ ] `TELEGRAM_API_HASH` preenchido
- [ ] `TELEGRAM_PHONE` preenchido
- [ ] `API_TOKEN` gerado e preenchido
- [ ] `npm install` executado
- [ ] Servidor iniciado (`node server.js`)
- [ ] Login no Telegram feito (primeira vez)
- [ ] Health check retorna `telegram_connected: true`

### **N8N**
- [ ] `TELEGRAM_PROXY_URL` configurado
- [ ] `TELEGRAM_PROXY_TOKEN` configurado (igual ao `API_TOKEN`)
- [ ] `TELEGRAM_CHANNELS` configurado
- [ ] `MESSAGES_PER_CHANNEL` configurado
- [ ] `GEMINI_API_KEY` configurado
- [ ] Credencial "Supabase Educacional" criada
- [ ] Workflow V3 importado
- [ ] Teste manual executado com sucesso

### **Supabase**
- [ ] Projeto criado
- [ ] Tabela `telegram_messages` criada
- [ ] Credenciais copiadas para N8N

---

## 🎯 PRÓXIMOS PASSOS

1. **Configurar tudo** seguindo este guia visual
2. **Validar** com o script: `./validar-configuracao.sh`
3. **Testar** o workflow manualmente no N8N
4. **Ativar** o Schedule Trigger (automatização)
5. **Monitorar** as execuções e verificar dados no Supabase

---

## 📚 DOCUMENTAÇÃO ADICIONAL

- **Guia Rápido**: `CHECKLIST_RAPIDO.md` (17 min)
- **Guia Completo**: `CONFIGURACAO_CREDENCIAIS_N8N.md` (todos os detalhes)
- **Validação**: `TESTE_VALIDACAO.md` (testes passo a passo)
- **Avaliação**: `RELATORIO_AVALIACAO.md` (nota 5/5)

---

**Status**: Workflow V3 pronto ✅ | Guias criados ✅ | Aguardando configuração ⏳

**Última atualização**: 2025-12-20
