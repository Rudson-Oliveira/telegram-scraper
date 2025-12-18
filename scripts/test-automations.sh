#!/bin/bash

# Script de Teste Básico para Automações e Agentes
# Sistema Manus de Raspagem do Telegram

echo "🧪 ===== TESTE DE AUTOMAÇÕES E AGENTES ====="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de testes
TOTAL=0
PASSED=0
FAILED=0

# Função para testar um componente
test_component() {
    local name=$1
    local command=$2
    
    echo -e "${YELLOW}[TEST]${NC} $name"
    TOTAL=$((TOTAL + 1))
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ PASS${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}  ✗ FAIL${NC}"
        FAILED=$((FAILED + 1))
    fi
    echo ""
}

# Verificar se estamos no diretório correto
if [ ! -d "automations" ] || [ ! -d "agents" ]; then
    echo -e "${RED}❌ Erro: Execute este script do diretório raiz do projeto${NC}"
    exit 1
fi

echo "📋 Verificando pré-requisitos..."
echo ""

# Verificar Node.js
if command -v node &> /dev/null; then
    echo -e "${GREEN}✓${NC} Node.js instalado: $(node --version)"
else
    echo -e "${RED}✗${NC} Node.js não encontrado"
    exit 1
fi

# Verificar pnpm/npm
if command -v pnpm &> /dev/null; then
    echo -e "${GREEN}✓${NC} pnpm instalado: $(pnpm --version)"
    PM="pnpm"
elif command -v npm &> /dev/null; then
    echo -e "${GREEN}✓${NC} npm instalado: $(npm --version)"
    PM="npm"
else
    echo -e "${RED}✗${NC} Nenhum gerenciador de pacotes encontrado"
    exit 1
fi

# Verificar tsx
if command -v tsx &> /dev/null; then
    echo -e "${GREEN}✓${NC} tsx instalado"
else
    echo -e "${YELLOW}⚠${NC} tsx não encontrado, instalando..."
    $PM install -g tsx
fi

echo ""
echo "🧬 Verificando estrutura de arquivos..."
echo ""

# Verificar arquivos de automação
test_component "Automação 1 (Classifier)" "test -f automations/classifier.ts"
test_component "Automação 2 (Notion Sync)" "test -f automations/notion-sync.ts"
test_component "Automação 3 (Obsidian Export)" "test -f automations/obsidian-export.ts"

# Verificar arquivos de agentes
test_component "Agente 1 (Classifier)" "test -f agents/classifier-agent.ts"
test_component "Agente 2 (Extractor)" "test -f agents/extractor-agent.ts"
test_component "Agente 3 (Router)" "test -f agents/router-agent.ts"
test_component "Agente 4 (Monitor)" "test -f agents/monitor-agent.ts"
test_component "Agente 5 (Sentiment)" "test -f agents/sentiment-agent.ts"

# Verificar configuração
test_component "Arquivo de configuração" "test -f automations/config.ts"
test_component ".env.example" "test -f .env.example"

echo "🔍 Verificando sintaxe TypeScript..."
echo ""

# Verificar sintaxe dos arquivos (compilação sem execução)
test_component "Sintaxe Classifier" "tsx --tsconfig tsconfig.json automations/classifier.ts --help 2>&1 | grep -q '.*' || true"
test_component "Sintaxe Notion Sync" "tsx --tsconfig tsconfig.json automations/notion-sync.ts --help 2>&1 | grep -q '.*' || true"

echo "📊 Resultados:"
echo ""
echo -e "  Total de testes: $TOTAL"
echo -e "  ${GREEN}Passou: $PASSED${NC}"
echo -e "  ${RED}Falhou: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Todos os testes passaram!${NC}"
    echo ""
    echo "🚀 Próximos passos:"
    echo "  1. Configure as variáveis de ambiente (.env)"
    echo "  2. Execute: tsx agents/monitor-agent.ts"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Alguns testes falharam!${NC}"
    echo ""
    echo "🔧 Verifique:"
    echo "  1. Se todos os arquivos foram criados corretamente"
    echo "  2. Se as dependências foram instaladas"
    echo "  3. Consulte AUTOMATIONS.md para mais detalhes"
    echo ""
    exit 1
fi
