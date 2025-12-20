#!/bin/bash

# ========================================
# Script de Validação de Configuração
# Telegram Scraper V3 - N8N
# ========================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para exibir títulos
title() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Função para sucesso
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Função para erro
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Função para aviso
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Função para info
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ========================================
# 1. VERIFICAR ESTRUTURA DE ARQUIVOS
# ========================================
title "1. Verificando estrutura de arquivos"

if [ -d "telegram-proxy-service" ]; then
    success "Diretório telegram-proxy-service encontrado"
else
    error "Diretório telegram-proxy-service não encontrado!"
    exit 1
fi

if [ -f "telegram-proxy-service/.env.example" ]; then
    success "Arquivo .env.example encontrado"
else
    warning "Arquivo .env.example não encontrado (criado agora)"
fi

if [ -f "telegram-proxy-service/.env" ]; then
    success "Arquivo .env encontrado"
else
    warning "Arquivo .env NÃO encontrado - você precisa criar!"
    info "Execute: cd telegram-proxy-service && cp .env.example .env"
    exit 1
fi

if [ -f "n8n-telegram-scraper-v3-improved.json" ]; then
    success "Workflow V3 encontrado"
else
    error "Workflow V3 não encontrado!"
    exit 1
fi

# ========================================
# 2. VERIFICAR VARIÁVEIS DE AMBIENTE
# ========================================
title "2. Verificando variáveis de ambiente (.env)"

cd telegram-proxy-service

# Carregar variáveis do .env
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Verificar variáveis obrigatórias
REQUIRED_VARS=(
    "TELEGRAM_API_ID"
    "TELEGRAM_API_HASH"
    "TELEGRAM_PHONE"
    "API_TOKEN"
    "PORT"
)

ALL_VARS_OK=true

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        error "$var não está definida no .env"
        ALL_VARS_OK=false
    else
        # Verificar se é um placeholder
        if [[ "${!var}" == *"SEU_"* ]] || [[ "${!var}" == *"seu-"* ]]; then
            warning "$var ainda está com valor de exemplo"
            ALL_VARS_OK=false
        else
            success "$var está configurada"
        fi
    fi
done

if [ "$ALL_VARS_OK" = false ]; then
    error "Algumas variáveis não estão configuradas corretamente!"
    info "Edite o arquivo .env e substitua os valores de exemplo"
    exit 1
fi

# ========================================
# 3. VERIFICAR DEPENDÊNCIAS
# ========================================
title "3. Verificando dependências do Node.js"

if [ ! -d "node_modules" ]; then
    warning "Dependências não instaladas"
    info "Execute: npm install"
    exit 1
else
    success "Dependências instaladas"
fi

# Verificar versão do Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    success "Node.js v$NODE_VERSION (>= 18 requerido)"
else
    error "Node.js v$NODE_VERSION é muito antiga (>= 18 requerida)"
    exit 1
fi

# ========================================
# 4. VERIFICAR CONEXÃO COM TELEGRAM
# ========================================
title "4. Verificando conexão com Telegram"

if [ -n "$TELEGRAM_SESSION" ]; then
    success "Sessão do Telegram configurada"
    info "Você já fez login anteriormente"
else
    warning "Sessão do Telegram NÃO configurada"
    info "Na primeira execução, você precisará fazer login com o código do Telegram"
fi

# ========================================
# 5. VERIFICAR SE O SERVIDOR ESTÁ RODANDO
# ========================================
title "5. Verificando se o microserviço está rodando"

if curl -s http://localhost:${PORT:-3000}/health > /dev/null 2>&1; then
    success "Microserviço está rodando na porta ${PORT:-3000}"
    
    # Verificar status do Telegram
    RESPONSE=$(curl -s http://localhost:${PORT:-3000}/health)
    TELEGRAM_STATUS=$(echo "$RESPONSE" | grep -o '"telegram_connected":[^,]*' | cut -d':' -f2)
    
    if [ "$TELEGRAM_STATUS" = "true" ]; then
        success "Telegram conectado com sucesso!"
    else
        warning "Telegram NÃO está conectado"
        info "Execute o servidor com: node server.js"
        info "Você precisará inserir o código de verificação do Telegram"
    fi
else
    warning "Microserviço NÃO está rodando"
    info "Inicie com: node server.js"
fi

# ========================================
# 6. RESUMO DA CONFIGURAÇÃO
# ========================================
title "6. Resumo da Configuração"

echo "📋 Variáveis de Ambiente:"
echo "   ├── TELEGRAM_API_ID: ${TELEGRAM_API_ID:0:5}..."
echo "   ├── TELEGRAM_API_HASH: ${TELEGRAM_API_HASH:0:10}..."
echo "   ├── TELEGRAM_PHONE: $TELEGRAM_PHONE"
echo "   ├── API_TOKEN: ${API_TOKEN:0:10}..."
echo "   └── PORT: ${PORT:-3000}"
echo ""

# ========================================
# 7. PRÓXIMOS PASSOS
# ========================================
title "7. Próximos Passos"

if [ "$ALL_VARS_OK" = true ]; then
    echo "✅ Configuração validada com sucesso!"
    echo ""
    echo "📝 O que fazer agora:"
    echo ""
    echo "1️⃣  Iniciar o microserviço (se ainda não está rodando):"
    echo "    cd telegram-proxy-service"
    echo "    node server.js"
    echo ""
    echo "2️⃣  Configurar o N8N:"
    echo "    - Acesse: https://workflows.hospitalarsaude.com.br"
    echo "    - Vá em: Settings → Environments"
    echo "    - Adicione as variáveis:"
    echo "      • TELEGRAM_PROXY_URL=http://localhost:3000"
    echo "      • TELEGRAM_PROXY_TOKEN=$API_TOKEN"
    echo "      • TELEGRAM_CHANNELS=aicommunitybr,chatgptbrasil"
    echo "      • MESSAGES_PER_CHANNEL=100"
    echo "      • GEMINI_API_KEY=sua-chave-api"
    echo ""
    echo "3️⃣  Testar o workflow:"
    echo "    - Abra o workflow V3 no N8N"
    echo "    - Clique em 'Execute Workflow'"
    echo "    - Aguarde 3-5 minutos"
    echo ""
    echo "4️⃣  Verificar logs:"
    echo "    - Microserviço: veja o terminal onde está rodando"
    echo "    - N8N: clique em 'Execution' → 'View Logs'"
    echo ""
    echo "📚 Documentação:"
    echo "   ├── CHECKLIST_RAPIDO.md (guia rápido)"
    echo "   ├── CONFIGURACAO_CREDENCIAIS_N8N.md (guia completo)"
    echo "   ├── TESTE_VALIDACAO.md (testes detalhados)"
    echo "   └── RELATORIO_AVALIACAO.md (nota 5/5)"
    echo ""
else
    echo "❌ Configuração incompleta!"
    echo ""
    echo "📝 O que fazer:"
    echo ""
    echo "1. Edite o arquivo .env:"
    echo "   cd telegram-proxy-service"
    echo "   nano .env"
    echo ""
    echo "2. Substitua os valores de exemplo:"
    echo "   - TELEGRAM_API_ID: obtenha em https://my.telegram.org/apps"
    echo "   - TELEGRAM_API_HASH: obtenha em https://my.telegram.org/apps"
    echo "   - TELEGRAM_PHONE: seu número (ex: +5511999999999)"
    echo "   - API_TOKEN: gere com 'openssl rand -hex 32'"
    echo ""
    echo "3. Execute este script novamente:"
    echo "   ./validar-configuracao.sh"
    echo ""
fi

# ========================================
# 8. TESTES AUTOMATIZADOS
# ========================================
title "8. Testes Automatizados (opcional)"

echo "🧪 Você pode executar a suite de testes:"
echo "   cd telegram-proxy-service"
echo "   node test-improved.js"
echo ""
echo "Isso vai validar:"
echo "   ✓ Health check"
echo "   ✓ Autenticação"
echo "   ✓ Rate limiting"
echo "   ✓ Validação de entrada"
echo "   ✓ Tratamento de erros"
echo ""

cd ..

exit 0
