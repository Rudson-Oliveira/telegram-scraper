#!/bin/bash

# ================================================================
# TELEGRAM PROXY SERVICE - SETUP SCRIPT
# Script automatizado para configuração inicial
# ================================================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║      TELEGRAM PROXY SERVICE - SETUP WIZARD                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ================================================================
# Função: Verificar dependências
# ================================================================
check_dependencies() {
    echo "📋 Verificando dependências..."
    
    local missing_deps=()
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if ! command -v docker &> /dev/null; then
        echo "⚠️  Docker não encontrado (opcional)"
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo "❌ Dependências faltando: ${missing_deps[*]}"
        echo ""
        echo "Por favor, instale:"
        echo "  - Node.js 18+: https://nodejs.org/"
        echo "  - npm (vem com Node.js)"
        exit 1
    fi
    
    echo "✅ Todas as dependências encontradas"
    echo ""
}

# ================================================================
# Função: Configurar .env
# ================================================================
setup_env() {
    echo "⚙️  Configurando arquivo .env..."
    echo ""
    
    if [ -f .env ]; then
        read -p "Arquivo .env já existe. Sobrescrever? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "ℹ️  Mantendo .env existente"
            return
        fi
    fi
    
    cp .env.example .env
    
    echo "Por favor, forneça as seguintes informações:"
    echo ""
    
    # API ID
    read -p "TELEGRAM_API_ID (obtenha em https://my.telegram.org/apps): " API_ID
    sed -i "s/your_api_id_here/$API_ID/" .env
    
    # API Hash
    read -p "TELEGRAM_API_HASH: " API_HASH
    sed -i "s/your_api_hash_here/$API_HASH/" .env
    
    # Phone
    read -p "TELEGRAM_PHONE (ex: +5511999999999): " PHONE
    sed -i "s/+5511999999999/$PHONE/" .env
    
    # API Token
    echo ""
    echo "Gerando API_TOKEN seguro..."
    API_TOKEN=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    sed -i "s/change-me-to-secure-token/$API_TOKEN/" .env
    echo "✅ API_TOKEN gerado: ${API_TOKEN:0:20}..."
    
    echo ""
    echo "✅ Arquivo .env configurado com sucesso!"
    echo ""
}

# ================================================================
# Função: Instalar dependências
# ================================================================
install_deps() {
    echo "📦 Instalando dependências Node.js..."
    echo ""
    
    npm install
    
    echo ""
    echo "✅ Dependências instaladas!"
    echo ""
}

# ================================================================
# Função: Testar configuração
# ================================================================
run_tests() {
    echo "🧪 Executando testes..."
    echo ""
    
    npm test
    
    echo ""
}

# ================================================================
# Função: Iniciar servidor
# ================================================================
start_server() {
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                    INICIANDO SERVIDOR                      ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "IMPORTANTE:"
    echo "  - Na primeira execução, você precisará fornecer o código"
    echo "    recebido no Telegram"
    echo "  - Após autenticação, copie o SESSION_STRING dos logs"
    echo "  - Adicione ao .env: TELEGRAM_SESSION=..."
    echo ""
    read -p "Pressione ENTER para continuar..." -r
    echo ""
    
    npm start
}

# ================================================================
# Menu Principal
# ================================================================
main_menu() {
    while true; do
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║                      MENU PRINCIPAL                        ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Escolha uma opção:"
        echo ""
        echo "  1) Setup completo (recomendado para primeira vez)"
        echo "  2) Configurar .env apenas"
        echo "  3) Instalar dependências"
        echo "  4) Executar testes"
        echo "  5) Iniciar servidor"
        echo "  6) Iniciar com Docker"
        echo "  7) Sair"
        echo ""
        read -p "Opção: " choice
        
        case $choice in
            1)
                check_dependencies
                setup_env
                install_deps
                run_tests
                start_server
                break
                ;;
            2)
                setup_env
                ;;
            3)
                install_deps
                ;;
            4)
                run_tests
                ;;
            5)
                start_server
                break
                ;;
            6)
                docker_start
                break
                ;;
            7)
                echo "👋 Até logo!"
                exit 0
                ;;
            *)
                echo "❌ Opção inválida"
                echo ""
                ;;
        esac
    done
}

# ================================================================
# Função: Docker
# ================================================================
docker_start() {
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker não encontrado!"
        echo "Instale em: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    echo "🐳 Iniciando com Docker..."
    echo ""
    
    if [ ! -f .env ]; then
        echo "⚠️  Arquivo .env não encontrado"
        setup_env
    fi
    
    docker-compose up -d
    
    echo ""
    echo "✅ Serviço iniciado com Docker!"
    echo ""
    echo "Ver logs:"
    echo "  docker-compose logs -f"
    echo ""
    echo "Parar serviço:"
    echo "  docker-compose down"
    echo ""
}

# ================================================================
# Quick Start (modo não-interativo)
# ================================================================
if [ "$1" == "--quick" ]; then
    echo "🚀 Quick Start Mode"
    check_dependencies
    
    if [ ! -f .env ]; then
        echo "❌ Arquivo .env não encontrado!"
        echo "Execute sem --quick para configurar interativamente"
        echo "Ou copie .env.example para .env e edite manualmente"
        exit 1
    fi
    
    install_deps
    npm start
    exit 0
fi

# ================================================================
# Executar Menu Principal
# ================================================================
main_menu
