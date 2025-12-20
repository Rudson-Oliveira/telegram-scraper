# ✅ Checklist Rápido - Resolver "Credenciais não encontradas"

## 🎯 O QUE FAZER AGORA

### 📍 **Situação Atual**
- ✅ Workflow V3 importado no N8N
- ✅ Execução iniciada com sucesso
- ❌ **ERRO**: "Credenciais não encontradas" no nó "API de raspagem do Telegram"

### 🔧 **Causa do Erro**
O workflow precisa de:
1. Um **microserviço proxy** rodando
2. **Variáveis de ambiente** configuradas no N8N
3. **Credenciais do Telegram** configuradas no microserviço

---

## 🚀 SOLUÇÃO EM 5 PASSOS

### **PASSO 1: Obter Credenciais do Telegram** ⏱️ 5 minutos

1. Acesse: **https://my.telegram.org/apps**
2. Faça login com seu número de telefone
3. Clique em **"API development tools"**
4. Preencha:
   - **App title**: `N8N Scraper`
   - **Short name**: `n8nscraper`
5. Copie e salve:
   ```
   api_id:   ___________
   api_hash: ___________
   ```

### **PASSO 2: Gerar Token de Segurança** ⏱️ 1 minuto

Execute no terminal:
```bash
openssl rand -hex 32
```

**Ou use**: https://generate-random.org/api-token-generator

Salve o token gerado:
```
Token: ___________________________________________
```

### **PASSO 3: Configurar Microserviço** ⏱️ 5 minutos

```bash
# 1. Ir para o diretório
cd telegram-proxy-service

# 2. Copiar exemplo
cp .env.example .env

# 3. Editar arquivo
nano .env
```

**Cole isto no arquivo `.env`** (substitua os valores):
```bash
# Telegram (https://my.telegram.org/apps)
TELEGRAM_API_ID=SEU_API_ID_AQUI
TELEGRAM_API_HASH=SEU_API_HASH_AQUI
TELEGRAM_PHONE=+5511999999999
TELEGRAM_SESSION=

# Segurança (openssl rand -hex 32)
API_TOKEN=SEU_TOKEN_GERADO_AQUI

# Servidor
PORT=3000
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_MAX=30
RATE_LIMIT_WINDOW_MS=60000
```

**Salvar**: `Ctrl+X` → `Y` → `Enter`

### **PASSO 4: Iniciar Microserviço** ⏱️ 3 minutos

```bash
# 1. Instalar dependências (se ainda não fez)
npm install

# 2. Iniciar servidor
node server.js
```

**Você vai ver:**
```
🔐 Digite o código de verificação enviado pelo Telegram:
```

**Abra o Telegram no celular**, copie o código e cole no terminal.

**Sucesso:**
```
✅ Conectado ao Telegram com sucesso!
🚀 Servidor rodando na porta 3000
```

### **PASSO 5: Configurar N8N** ⏱️ 3 minutos

1. Acesse o N8N: `https://workflows.hospitalarsaude.com.br`
2. Vá em: **Settings → Environments**
3. Adicione estas variáveis:

| Variável | Valor | Onde obter |
|----------|-------|------------|
| `TELEGRAM_PROXY_URL` | `http://localhost:3000` | URL do microserviço |
| `TELEGRAM_PROXY_TOKEN` | O token gerado no Passo 2 | Mesmo do `.env` |
| `TELEGRAM_CHANNELS` | `aicommunitybr,chatgptbrasil` | Canais para raspar |
| `MESSAGES_PER_CHANNEL` | `100` | Qtd de mensagens |
| `GEMINI_API_KEY` | Sua chave API | https://aistudio.google.com/app/apikey |

**Importante**: `TELEGRAM_PROXY_TOKEN` deve ser **EXATAMENTE IGUAL** ao `API_TOKEN` do microserviço.

---

## ✅ VALIDAÇÃO

### **Teste 1: Microserviço**
```bash
curl http://localhost:3000/health
```

**Esperado:**
```json
{
  "status": "ok",
  "telegram_connected": true
}
```

### **Teste 2: N8N**
1. Abra o workflow V3 no N8N
2. Clique em **"Execute Workflow"**
3. Aguarde a execução (3-5 minutos)

**Sucesso:**
- ✅ Nó "API de raspagem do Telegram" → Verde
- ✅ Nó "Classificador IA" → Verde
- ✅ Nó "Supabase - Salvar Dados" → Verde

---

## 🐛 PROBLEMAS COMUNS

### ❌ **"Credenciais não encontradas"**
- **Causa**: Variáveis não configuradas no N8N
- **Solução**: Repita o Passo 5

### ❌ **"401 Unauthorized"**
- **Causa**: Tokens diferentes
- **Solução**: Use o **MESMO TOKEN** no `.env` e no N8N

### ❌ **"telegram_connected: false"**
- **Causa**: Login do Telegram falhou
- **Solução**: Delete `TELEGRAM_SESSION` do `.env` e reinicie o microserviço

### ❌ **"ECONNREFUSED"**
- **Causa**: Microserviço não está rodando
- **Solução**: Execute `node server.js` novamente

---

## 📊 ESTRUTURA COMPLETA

```
CREDENCIAIS NECESSÁRIAS:
├── Telegram API (https://my.telegram.org/apps)
│   ├── API ID
│   ├── API Hash
│   └── Telefone
├── Token de Segurança (openssl rand -hex 32)
│   ├── API_TOKEN (microserviço)
│   └── TELEGRAM_PROXY_TOKEN (N8N) ← DEVEM SER IGUAIS
├── Gemini API (https://aistudio.google.com/app/apikey)
│   └── API Key
└── Supabase (https://supabase.com/dashboard)
    ├── Project URL
    └── Anon Key
```

---

## 📞 PRECISA DE AJUDA?

1. **Logs do Microserviço**: Veja no terminal onde está rodando `node server.js`
2. **Logs do N8N**: Clique em "Execution" → "View Logs"
3. **Documentação**: Leia `CONFIGURACAO_CREDENCIAIS_N8N.md` (guia completo)
4. **Troubleshooting**: Consulte `TESTE_VALIDACAO.md` → Seção 7

---

## 🎯 PRÓXIMOS PASSOS

Depois que tudo estiver funcionando:

1. **Ativar agendamento**: N8N → Workflow → "Active" (executará de 6 em 6 horas)
2. **Monitorar execuções**: N8N → Executions
3. **Verificar dados**: Supabase → Table Editor → `telegram_messages`
4. **Exportar dados**: N8N → Execution → "Download" → CSV/XLSX

---

**Status**: Guia pronto ✅ | Microserviço configurado ⏳ | N8N aguardando credenciais ⏳

**Tempo estimado**: 17 minutos total

**Última atualização**: 2025-12-20
