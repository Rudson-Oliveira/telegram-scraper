# 🚀 Telegram Proxy Service

Microserviço Node.js para contornar restrições de segurança do N8N, permitindo raspagem de canais do Telegram usando a biblioteca `telegram` (gramjs).

## 📋 Índice

- [Problema Resolvido](#problema-resolvido)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Configuração](#configuração)
- [Deploy Local](#deploy-local)
- [Deploy em Cloud](#deploy-em-cloud)
- [Uso da API](#uso-da-api)
- [Integração com N8N](#integração-com-n8n)
- [Troubleshooting](#troubleshooting)

---

## 🔍 Problema Resolvido

O N8N bloqueia o uso de módulos externos como `telegram`, `telegram/sessions` e `input` por questões de segurança. Este microserviço:

✅ Roda em servidor separado  
✅ Usa biblioteca `telegram` (gramjs) livremente  
✅ Expõe API HTTP segura  
✅ Integra perfeitamente com N8N via HTTP Request Node  

---

## 🏗️ Arquitetura

```
┌─────────────┐         ┌─────────────────────┐         ┌──────────────┐
│   N8N       │  HTTP   │  Telegram Proxy     │  TG API │   Telegram   │
│  Workflow   ├────────►│    Microservice     ├────────►│   Servers    │
│             │◄────────┤  (Express + gramjs) │◄────────┤              │
└─────────────┘  JSON   └─────────────────────┘  Data   └──────────────┘
```

**Fluxo:**
1. N8N faz POST para `/scrape-telegram` com lista de canais
2. Microserviço conecta ao Telegram via gramjs
3. Raspa mensagens dos canais solicitados
4. Retorna JSON estruturado para N8N
5. N8N processa dados normalmente

---

## 📦 Pré-requisitos

### 1. Credenciais do Telegram

Acesse https://my.telegram.org/apps e crie uma aplicação:

- **API ID**: Número de identificação
- **API Hash**: Hash de autenticação
- **Telefone**: Seu número com código do país (+5511999999999)

### 2. Software Necessário

- **Node.js** 18+ (para deploy local)
- **Docker** (para deploy containerizado)
- **Git** (opcional)

---

## ⚙️ Configuração

### 1. Clonar/Copiar Arquivos

```bash
# Se clonar do repositório
git clone <repo-url>
cd telegram-proxy-service

# Ou copiar os arquivos manualmente para uma pasta
```

### 2. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
nano .env
```

Preencha com suas credenciais:

```env
PORT=3000

# Obtenha em https://my.telegram.org/apps
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
TELEGRAM_PHONE=+5511999999999

# Opcional - será gerado automaticamente no primeiro login
TELEGRAM_SESSION=

# Apenas se tiver 2FA habilitado
TELEGRAM_PASSWORD=

# Token de segurança - ALTERE PARA UM TOKEN FORTE!
API_TOKEN=meu-token-super-seguro-12345

NODE_ENV=production
```

⚠️ **IMPORTANTE**: Altere o `API_TOKEN` para um valor seguro e único!

---

## 🚀 Deploy Local

### Opção 1: Node.js Direto

```bash
# Instalar dependências
npm install

# Iniciar servidor
npm start

# Ou modo desenvolvimento (com auto-reload)
npm run dev
```

O serviço estará disponível em: `http://localhost:3000`

### Opção 2: Docker Compose (Recomendado)

```bash
# Build e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

### Opção 3: Docker Manual

```bash
# Build da imagem
docker build -t telegram-proxy-service .

# Rodar container
docker run -d \
  --name telegram-proxy \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  telegram-proxy-service
```

---

## ☁️ Deploy em Cloud

### Render.com (GRATUITO)

1. Acesse https://render.com e crie conta
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu repositório Git (ou faça upload dos arquivos)
4. Configure:
   - **Name**: telegram-proxy-service
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Adicione **Environment Variables**:
   - `TELEGRAM_API_ID`
   - `TELEGRAM_API_HASH`
   - `TELEGRAM_PHONE`
   - `API_TOKEN`
   - `NODE_ENV=production`
6. Clique em **"Create Web Service"**

**URL gerada**: `https://telegram-proxy-service-xxxx.onrender.com`

### Railway.app

1. Acesse https://railway.app
2. Clique em **"New Project"** → **"Deploy from GitHub"**
3. Selecione o repositório
4. Adicione variáveis de ambiente na aba **"Variables"**
5. Railway detectará automaticamente Node.js e fará deploy

### Heroku

```bash
# Instalar Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Criar app
heroku create telegram-proxy-service

# Configurar variáveis
heroku config:set TELEGRAM_API_ID=12345678
heroku config:set TELEGRAM_API_HASH=abc123...
heroku config:set TELEGRAM_PHONE=+5511999999999
heroku config:set API_TOKEN=token-seguro
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

### VPS/Servidor Próprio

```bash
# Clonar repositório
git clone <repo-url>
cd telegram-proxy-service

# Instalar dependências
npm ci --only=production

# Configurar .env
nano .env

# Usar PM2 para gerenciar processo
npm install -g pm2
pm2 start server.js --name telegram-proxy
pm2 save
pm2 startup

# Nginx como reverse proxy (opcional)
# /etc/nginx/sites-available/telegram-proxy
server {
    listen 80;
    server_name seu-dominio.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📡 Uso da API

### 1. Health Check

```bash
GET /health
```

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-18T10:30:00.000Z",
  "telegram_connected": true,
  "connection_error": null,
  "uptime": 3600.5,
  "memory": {
    "rss": 45678912,
    "heapTotal": 12345678,
    "heapUsed": 8765432
  }
}
```

### 2. Scrape Telegram

```bash
POST /scrape-telegram
Headers:
  Authorization: Bearer seu-api-token-aqui
  Content-Type: application/json

Body:
{
  "channels": ["aicommunitybr", "chatgptbrasil", "tecnologiaai"],
  "limit": 100
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "aicommunitybr_12345",
        "telegram_id": 12345,
        "date": "2025-12-18T10:00:00.000Z",
        "content": "Conteúdo da mensagem...",
        "channel": "aicommunitybr",
        "sender_id": "123456789",
        "sender_name": "User123",
        "message_type": "text",
        "has_media": false,
        "is_prompt": true,
        "views": 150,
        "forwards": 5,
        "scraped_at": "2025-12-18T10:30:00.000Z"
      }
    ],
    "stats": {
      "total_messages": 250,
      "total_channels": 3,
      "total_images": 10,
      "total_videos": 5,
      "total_prompts": 45,
      "channels_processed": [
        {
          "channel": "aicommunitybr",
          "messages": 100,
          "success": true
        }
      ],
      "errors": []
    },
    "timestamp": "2025-12-18T10:30:00.000Z"
  },
  "meta": {
    "request_time": "2025-12-18T10:30:00.000Z",
    "processing_time_ms": 15234
  }
}
```

### 3. Teste

```bash
GET /test
```

**Resposta:**
```json
{
  "message": "Telegram Proxy Service is running!",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /health",
    "scrape": "POST /scrape-telegram (requires auth)",
    "test": "GET /test"
  }
}
```

---

## 🔗 Integração com N8N

### 1. Substituir Code Node por HTTP Request Node

No workflow N8N:

1. **Deletar** o node "Telegram Scraper" (Code Node)
2. **Adicionar** HTTP Request Node
3. **Configurar**:

```
Name: Telegram Scraper API
Method: POST
URL: https://seu-microservico.com/scrape-telegram

Headers:
  Authorization: Bearer seu-api-token-aqui
  Content-Type: application/json

Body (JSON):
{
  "channels": {{ $json.channels || ["aicommunitybr", "chatgptbrasil"] }},
  "limit": {{ $json.limit || 100 }}
}

Options:
  Response Format: JSON
  Timeout: 120000 (2 minutos)
```

### 2. Processar Resposta

Adicione um Code Node após o HTTP Request para extrair mensagens:

```javascript
// Extrair mensagens da resposta
const response = $input.item.json;

if (!response.success) {
  throw new Error(`API Error: ${response.message}`);
}

const messages = response.data.messages;

// Retornar mensagens como array de itens
return messages.map(msg => ({ json: msg }));
```

### 3. Workflow Completo Atualizado

```
Schedule Trigger 
  → HTTP Request (Scraper API)
  → Code (Extract Messages)
  → Split In Batches
  → Classificador IA
  → Análise de Sentimento
  → Extrator de Conteúdo
  → Supabase
```

---

## 🐛 Troubleshooting

### Erro: "TELEGRAM_API_ID and TELEGRAM_API_HASH are required"

**Causa**: Variáveis de ambiente não configuradas  
**Solução**: Verifique se `.env` está preenchido corretamente

```bash
cat .env
# Certifique-se de que TELEGRAM_API_ID e TELEGRAM_API_HASH estão definidos
```

### Erro: "Phone code requested" / Input travado

**Causa**: Primeira autenticação requer código do Telegram  
**Solução**:

1. Execute localmente primeiro: `npm start`
2. Insira o código recebido no Telegram
3. Copie o `SESSION_STRING` gerado nos logs
4. Adicione ao `.env` como `TELEGRAM_SESSION=...`
5. Reinicie o serviço

### Erro: "Unauthorized" ao chamar API

**Causa**: Token inválido ou ausente  
**Solução**: Verifique header `Authorization`:

```bash
curl -X POST https://seu-microservico.com/scrape-telegram \
  -H "Authorization: Bearer seu-api-token-correto" \
  -H "Content-Type: application/json" \
  -d '{"channels":["test"], "limit":10}'
```

### Erro: "Too many requests"

**Causa**: Rate limiting ativado (máx 10 req/min)  
**Solução**: Aguarde 1 minuto ou ajuste rate limit em `server.js`:

```javascript
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // Aumentar limite
});
```

### Erro: FloodWaitError do Telegram

**Causa**: Telegram bloqueou temporariamente por excesso de requisições  
**Solução**: 
- Aguarde o tempo indicado no erro
- Reduza frequência de scraping
- Adicione mais delay entre canais

### Microserviço não conecta ao Telegram

**Diagnóstico**:

```bash
# Verificar logs
docker-compose logs -f

# Ou com PM2
pm2 logs telegram-proxy

# Testar health check
curl http://localhost:3000/health
```

**Soluções**:
1. Verifique conexão internet
2. Confirme credenciais corretas
3. Teste autenticação manual
4. Verifique se Telegram não bloqueou IP

---

## 📝 Logs e Monitoramento

### Ver logs em tempo real

```bash
# Docker Compose
docker-compose logs -f telegram-proxy

# PM2
pm2 logs telegram-proxy

# Docker standalone
docker logs -f telegram-proxy
```

### Monitorar saúde do serviço

Configure monitoramento com ferramentas como:

- **UptimeRobot**: Ping `/health` a cada 5 minutos
- **Cronitor**: Monitorar uptime e tempo de resposta
- **Prometheus + Grafana**: Métricas detalhadas

---

## 🔒 Segurança

### Recomendações:

1. **Use HTTPS** em produção (Render/Railway já incluem SSL)
2. **Altere API_TOKEN** para valor forte e único
3. **Não commite** `.env` para repositórios públicos
4. **Use secrets** do provedor cloud para variáveis sensíveis
5. **Configure firewall** para permitir apenas IPs do N8N
6. **Monitore logs** para detectar acessos suspeitos
7. **Atualize dependências** regularmente: `npm update`

---

## 📄 Licença

MIT License - Livre para uso comercial e pessoal

---

## 🤝 Suporte

Para problemas ou dúvidas:

1. Verifique a seção [Troubleshooting](#troubleshooting)
2. Revise os logs do serviço
3. Teste endpoints com `curl` ou Postman
4. Abra uma issue no repositório

---

## 🎉 Pronto!

Seu microserviço está configurado e funcionando. Agora você pode usar o N8N para automatizar raspagem do Telegram sem restrições de segurança!

**Próximos passos**:
1. ✅ Configure variáveis de ambiente
2. ✅ Faça deploy em cloud (Render/Railway)
3. ✅ Atualize workflow N8N
4. ✅ Teste integração completa
5. ✅ Configure monitoramento
