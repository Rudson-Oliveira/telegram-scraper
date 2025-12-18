#!/bin/bash

# Script de Setup - Sistema de Automações
# Sistema Manus de Raspagem do Telegram

echo "🚀 ===== SETUP: AUTOMAÇÕES E AGENTES ====="
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar diretório
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script do diretório raiz do projeto"
    exit 1
fi

echo -e "${BLUE}📦 Passo 1: Instalando dependências...${NC}"
echo ""

# Detectar gerenciador de pacotes
if command -v pnpm &> /dev/null; then
    echo "Usando pnpm..."
    pnpm add @google/generative-ai @notionhq/client @supabase/supabase-js node-cron fs-extra
elif command -v npm &> /dev/null; then
    echo "Usando npm..."
    npm install @google/generative-ai @notionhq/client @supabase/supabase-js node-cron fs-extra
else
    echo "❌ Nenhum gerenciador de pacotes encontrado (npm/pnpm)"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Dependências instaladas${NC}"
echo ""

echo -e "${BLUE}📁 Passo 2: Criando estrutura de diretórios...${NC}"
echo ""

# Criar diretórios
mkdir -p automations
mkdir -p agents
mkdir -p obsidian-vault/Tutoriais
mkdir -p scripts

echo -e "${GREEN}✓ Diretórios criados${NC}"
echo ""

echo -e "${BLUE}⚙️  Passo 3: Configurando ambiente...${NC}"
echo ""

# Verificar se .env já existe
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env já existe. Pulando criação...${NC}"
else
    echo "Criando .env a partir do template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ .env criado${NC}"
        echo -e "${YELLOW}⚠️  IMPORTANTE: Configure as credenciais no arquivo .env${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.example não encontrado${NC}"
    fi
fi

echo ""

echo -e "${BLUE}🔐 Passo 4: Verificando credenciais obrigatórias...${NC}"
echo ""

if [ -f ".env" ]; then
    source .env
    
    # Verificar credenciais essenciais
    MISSING=0
    
    if [ -z "$GEMINI_API_KEY" ]; then
        echo -e "${YELLOW}⚠️  GEMINI_API_KEY não configurado${NC}"
        MISSING=1
    else
        echo -e "${GREEN}✓ GEMINI_API_KEY configurado${NC}"
    fi
    
    if [ -z "$SUPABASE_URL" ]; then
        echo -e "${YELLOW}⚠️  SUPABASE_URL não configurado${NC}"
        MISSING=1
    else
        echo -e "${GREEN}✓ SUPABASE_URL configurado${NC}"
    fi
    
    if [ -z "$SUPABASE_ANON_KEY" ]; then
        echo -e "${YELLOW}⚠️  SUPABASE_ANON_KEY não configurado${NC}"
        MISSING=1
    else
        echo -e "${GREEN}✓ SUPABASE_ANON_KEY configurado${NC}"
    fi
    
    echo ""
    
    if [ $MISSING -eq 1 ]; then
        echo -e "${YELLOW}⚠️  Algumas credenciais estão faltando. Configure o arquivo .env antes de executar.${NC}"
    fi
fi

echo ""
echo -e "${BLUE}🧪 Passo 5: Executando testes básicos...${NC}"
echo ""

# Tornar script de teste executável
chmod +x scripts/test-automations.sh

# Executar testes
./scripts/test-automations.sh

echo ""
echo -e "${GREEN}✅ Setup concluído!${NC}"
echo ""
echo "📚 Documentação:"
echo "  - AUTOMATIONS.md: Documentação completa"
echo "  - AUTOMATION_TESTS.md: Relatório de testes"
echo ""
echo "🎯 Quick Start:"
echo ""
echo "  1. Configure credenciais no .env:"
echo -e "     ${YELLOW}nano .env${NC}"
echo ""
echo "  2. Execute o pipeline completo:"
echo -e "     ${YELLOW}tsx agents/monitor-agent.ts${NC}"
echo ""
echo "  3. Ou execute componentes individuais:"
echo -e "     ${YELLOW}tsx automations/classifier.ts${NC}"
echo -e "     ${YELLOW}tsx agents/sentiment-agent.ts${NC}"
echo ""
echo "  4. Modo daemon (contínuo):"
echo -e "     ${YELLOW}tsx agents/monitor-agent.ts --daemon${NC}"
echo ""
echo "💡 Dica: Consulte AUTOMATIONS.md para uso detalhado"
echo ""
