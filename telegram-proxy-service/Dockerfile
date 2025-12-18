# ================================================================
# DOCKERFILE - TELEGRAM PROXY SERVICE
# Build: docker build -t telegram-proxy-service .
# Run: docker run -p 3000:3000 --env-file .env telegram-proxy-service
# ================================================================

FROM node:18-alpine

# Metadados
LABEL maintainer="Telegram Proxy Service"
LABEL description="Microserviço para contornar restrições do N8N - Scraping de Telegram"
LABEL version="1.0.0"

# Diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar código fonte
COPY server.js .
COPY .env.example .env.example

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Iniciar aplicação
CMD ["node", "server.js"]
