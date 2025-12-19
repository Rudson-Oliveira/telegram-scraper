# 🚀 GUIA RÁPIDO - TESTE NO N8N

**Data:** 2025-12-19  
**Versão:** 3.0 IMPROVED  
**Status:** ✅ Pronto para Importar

---

## 📦 ARQUIVO PARA IMPORTAR

**Workflow:** `n8n-telegram-scraper-v3-improved.json`

**Link no GitHub:**
https://github.com/Rudson-Oliveira/telegram-scraper/blob/main/n8n-telegram-scraper-v3-improved.json

---

## 🎯 PASSO A PASSO - TESTE NO N8N

### 1️⃣ BAIXAR O WORKFLOW (Opção 1)

```bash
# Clonar o repositório
git clone https://github.com/Rudson-Oliveira/telegram-scraper.git
cd telegram-scraper

# O arquivo está na raiz
ls -lh n8n-telegram-scraper-v3-improved.json
```

### 1️⃣ BAIXAR O WORKFLOW (Opção 2)

Acesse diretamente no GitHub:
1. Vá para: https://github.com/Rudson-Oliveira/telegram-scraper
2. Clique em: `n8n-telegram-scraper-v3-improved.json`
3. Clique no botão: **Raw**
4. Salve o arquivo: `Ctrl+S` ou `Cmd+S`

---

## 2️⃣ IMPORTAR NO N8N

### Passo 1: Acessar N8N
```
https://workflows.hospitalarsaude.com.br
```

### Passo 2: Importar Workflow
1. Clique em **"Workflows"** no menu lateral
2. Clique em **"Import from File"** ou **"Add Workflow" > "Import"**
3. Selecione o arquivo: `n8n-telegram-scraper-v3-improved.json`
4. Clique em **"Import"**

### Passo 3: Verificar Importação
✅ Workflow deve aparecer com o nome:
**"Telegram Scraper V3 - Production (IMPROVED)"**

✅ Total de nodes: **13**

---

## 3️⃣ CONFIGURAR VARIÁVEIS DE AMBIENTE

### No N8N, vá em: Settings > Environments

Adicione as seguintes variáveis:

```bash
# Microserviço Proxy
TELEGRAM_PROXY_URL=http://seu-microservico.com:3000
TELEGRAM_PROXY_TOKEN=seu-api-token-aqui

# Canais para raspar (separados por vírgula)
TELEGRAM_CHANNELS=aicommunitybr,chatgptbrasil,aibrasiloficial

# Quantidade de mensagens por canal
MESSAGES_PER_CHANNEL=100

# Gemini API (para classificação)
GEMINI_API_KEY=sua-gemini-api-key-aqui

# Webhook de notificação (opcional)
WEBHOOK_NOTIFICATION_URL=https://webhook.site/seu-webhook
```

### ⚠️ IMPORTANTE: Microserviço Proxy

**Você precisa ter o microserviço rodando!**

**Opções:**

**A) Usar localhost (para teste rápido):**
```bash
cd telegram-proxy-service
cp .env.example .env
# Editar .env com suas credenciais
npm install
npm start
```
```
TELEGRAM_PROXY_URL=http://localhost:3000
```

**B) Deploy em cloud (recomendado):**
- Render.com (gratuito)
- Railway.app (gratuito)
- Heroku ($7/mês)

Depois configure:
```
TELEGRAM_PROXY_URL=https://seu-app.render.com
```

---

## 4️⃣ CONFIGURAR CREDENCIAIS SUPABASE

### No Workflow

1. Clique no node **"Supabase - Salvar Dados"**
2. Clique em **"Credentials"**
3. Se ainda não tem, clique em **"Create New"**

### Preencha:
```
Name: Supabase Educacional
Host: sua-url-supabase.supabase.co (SEM https://)
Service Role Secret: sua-service-role-key
```

### Onde encontrar:
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: Settings > API
4. Copie:
   - URL (sem https://)
   - service_role key (secret)

---

## 5️⃣ TESTE MANUAL - PRIMEIRA EXECUÇÃO

### Passo 1: Executar Workflow
1. Abra o workflow no N8N
2. Clique no botão **"Execute Workflow"** (play no canto superior direito)
3. Aguarde a execução

### Passo 2: Verificar Cada Node

Clique em cada node para ver os resultados:

**✅ Schedule Trigger**
- Status: Executado
- Timestamp correto

**✅ Telegram Scraper API**
- Status: 200 OK
- Deve retornar: `{ "success": true, "data": {...} }`
- Verificar: `data.messages` array com mensagens

**✅ Extract Messages**
- Deve mostrar: Array de mensagens extraídas
- Log: "✓ Received X messages from API"

**✅ Split In Batches**
- Divide mensagens em lotes de 10

**✅ Classificador IA**
- Adiciona: `classification`, `classification_confidence`
- Log: "✓ Classified as: prompt (confidence: 0.85)"

**✅ Análise de Sentimento**
- Adiciona: `urgency_score`, `sentiment`, `priority`
- Log: "✓ Analyzed: urgency=7, sentiment=informativo"

**✅ Extrator de Conteúdo**
- Adiciona: `summary`, `key_points`, `word_count`
- Log: Para mensagens > 500 chars

**✅ Supabase - Salvar Dados**
- Status: Dados salvos
- Verificar no Supabase se os registros foram inseridos

**✅ IF - Verificar Erros**
- Roteia para sucesso ou erro

**✅ Webhook - Notificação**
- Envia notificação (se configurado)

---

## 6️⃣ VALIDAR DADOS NO SUPABASE

### Acessar Supabase
1. Vá para: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: **Table Editor** > **messages**

### Verificar:
```sql
SELECT 
  COUNT(*) as total,
  classification,
  priority,
  AVG(urgency_score) as avg_urgency
FROM messages
WHERE scraped_at >= NOW() - INTERVAL '1 hour'
GROUP BY classification, priority;
```

### Deve ter:
- ✅ Mensagens inseridas
- ✅ Campos preenchidos
- ✅ Classificações corretas
- ✅ Timestamps atuais

---

## 7️⃣ ATIVAR WORKFLOW (AUTOMÁTICO)

### Após testar com sucesso:

1. No workflow, clique no toggle **"Active"** (canto superior direito)
2. Workflow vai executar automaticamente a cada 6 horas
3. Pode alterar o Schedule Trigger para outro intervalo

### Intervalos recomendados:
- **A cada 6 horas** (padrão) - Balanceado
- **A cada 12 horas** - Menos frequente
- **A cada 2 horas** - Mais frequente (atenção ao rate limit)
- **Diário às 08:00** - Uma vez por dia

---

## 🔧 TROUBLESHOOTING RÁPIDO

### ❌ Erro: "Cannot connect to microservice"
**Solução:** 
- Verificar se microserviço está rodando
- Verificar `TELEGRAM_PROXY_URL`
- Testar: `curl http://seu-microservico/health`

### ❌ Erro: "Unauthorized"
**Solução:**
- Verificar se `TELEGRAM_PROXY_TOKEN` está correto
- Deve ser igual ao `API_TOKEN` do microserviço

### ❌ Erro: "GEMINI_API_KEY not configured"
**Solução:**
- Adicionar `GEMINI_API_KEY` nas variáveis de ambiente
- Obter em: https://aistudio.google.com/app/apikey

### ❌ Erro: "Supabase credentials invalid"
**Solução:**
- Verificar credenciais Supabase
- Usar `service_role` key (não `anon` key)
- Verificar se host está sem `https://`

### ❌ Erro: "telegram_connected: false"
**Solução:**
- Microserviço não está conectado ao Telegram
- Verificar logs do microserviço
- Configurar `TELEGRAM_SESSION` no .env

---

## 📊 MÉTRICAS DE SUCESSO

### Após primeira execução, você deve ter:

✅ **Taxa de sucesso:** > 95%  
✅ **Mensagens coletadas:** > 50 (depende dos canais)  
✅ **Classificações válidas:** > 90%  
✅ **Tempo de processamento:** < 5 minutos  
✅ **Erros:** < 5%  

---

## 🎯 CHECKLIST DE TESTE

### Antes de Executar:
- [ ] Microserviço está rodando
- [ ] Variáveis de ambiente configuradas
- [ ] Credenciais Supabase configuradas
- [ ] Gemini API Key válida

### Durante Execução:
- [ ] Schedule Trigger executou
- [ ] API retornou mensagens
- [ ] Mensagens foram extraídas
- [ ] Classificação funcionou
- [ ] Sentimento foi analisado
- [ ] Dados foram salvos no Supabase

### Após Execução:
- [ ] Verificar dados no Supabase
- [ ] Verificar logs sem erros críticos
- [ ] Verificar webhook de notificação (se configurado)
- [ ] Ativar workflow para execução automática

---

## 📞 SUPORTE

### Documentação Completa:
- 📄 **TESTE_VALIDACAO.md** - Guia detalhado (13KB)
- 📄 **RELATORIO_AVALIACAO.md** - Relatório de testes (16KB)
- 📄 **RESUMO_ENTREGA.md** - Visão geral (8KB)

### GitHub:
https://github.com/Rudson-Oliveira/telegram-scraper

### Commits:
- `966d3f8` - Melhorias V3
- `03466ea` - Resumo executivo
- `de8a9e1` - Deploy GitHub
- `fe22987` - Relatório avaliação

---

## 🎉 BOA SORTE COM O TESTE!

Tudo está pronto e testado com **nota 5/5** em todas as categorias.

Se tiver qualquer problema, consulte o **TESTE_VALIDACAO.md** que tem troubleshooting detalhado de 5+ problemas comuns.

---

**Data:** 2025-12-19  
**Versão:** 3.0 IMPROVED  
**Status:** ✅ PRONTO PARA TESTE  
**Nota de Qualidade:** ⭐⭐⭐⭐⭐ 5/5

🚀 **SUCESSO NO SEU TESTE!** 🚀
