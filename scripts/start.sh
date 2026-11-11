#!/usr/bin/env bash

set -e

# Resolve a raiz do projeto independentemente de onde o script foi chamado
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 ETEC Timetabling (EtecFlow) - Script de Inicialização (Linux)"
echo "================================================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

SEED_MODE=""
for arg in "$@"; do
    case "$arg" in
        --seed) SEED_MODE="seed.js" ;;
        --seed-simple) SEED_MODE="seed-simple.js" ;;
        --seed-full) SEED_MODE="seed_full.js" ;;
        --no-seed) SEED_MODE="none" ;;
    esac
done

BACKEND_PORT="${BACKEND_PORT:-}"
if [ -z "$BACKEND_PORT" ]; then
    if (command_exists ss && ss -tln | grep -q ":8080 ") || (command_exists netstat && netstat -tln 2>/dev/null | grep -q ":8080 "); then
        BACKEND_PORT="8085"
        print_warning "Porta 8080 ocupada no host. Usando porta alternativa: $BACKEND_PORT"
    else
        BACKEND_PORT="8080"
    fi
fi
export BACKEND_PORT

# 1. Verificar dependências
echo ""
echo "📦 Verificando dependências..."
echo ""

if ! command_exists docker; then
    print_error "Docker não encontrado. Instale o Docker antes de continuar."
    exit 1
else
    print_status "Docker encontrado"
fi

if ! docker compose version >/dev/null 2>&1 && ! command_exists docker-compose; then
    print_error "Docker Compose não encontrado."
    exit 1
else
    print_status "Docker Compose disponível"
fi

if command_exists node; then
    print_status "Node.js $(node -v) encontrado"
else
    print_warning "Node.js não encontrado localmente (necessário apenas para rodar scripts de seed fora do container)"
fi

if command_exists java; then
    print_status "Java $(java -version 2>&1 | head -1) encontrado"
fi

# 2. Limpar containers antigos
echo ""
echo "🧹 Limpando containers anteriores..."
docker compose down 2>/dev/null || true
print_status "Containers anteriores finalizados"

# 3. Iniciar Docker Compose
echo ""
echo "🐳 Iniciando serviços com Docker Compose..."
docker compose up -d --build

# 4. Aguardar backend ficar saudável via healthcheck
echo ""
echo "⏳ Aguardando backend ficar pronto em http://localhost:${BACKEND_PORT}/api/health ..."
MAX_RETRIES=45
COUNT=0
until curl -fsS "http://localhost:${BACKEND_PORT}/api/health" >/dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
        print_error "Timeout aguardando o backend iniciar. Verifique os logs com: docker compose logs backend"
        exit 1
    fi
    sleep 2
done
print_status "Backend online e saudável!"

# 5. Executar seed (opcional)
if [ -z "$SEED_MODE" ]; then
    echo ""
    read -p "Deseja executar o seed de dados? [s=padrão / f=completo / m=simples / n=não] (s/f/m/n): " -n 1 -r
    echo
    case "$REPLY" in
        [Ss]) SEED_MODE="seed.js" ;;
        [Ff]) SEED_MODE="seed_full.js" ;;
        [Mm]) SEED_MODE="seed-simple.js" ;;
        *) SEED_MODE="none" ;;
    esac
fi

if [ "$SEED_MODE" != "none" ]; then
    if command_exists node; then
        echo "🌱 Executando scripts/$SEED_MODE..."
        API_BASE="http://localhost:${BACKEND_PORT}" node "scripts/$SEED_MODE"
        print_status "Seed ($SEED_MODE) executado com sucesso"
    else
        print_error "Node.js não encontrado. Pulando seed."
    fi
fi

# 6. Resultado final
echo ""
echo "================================================================"
echo -e "${GREEN}✓ Serviços iniciados com sucesso!${NC}"
echo ""
echo "📍 URLs de acesso:"
echo "   Backend:  http://localhost:${BACKEND_PORT}"
echo "   Frontend: http://localhost:3000"
echo ""
echo "📝 Comandos úteis:"
echo "   Parar serviços:     ./scripts/stop.sh"
echo "   Popular banco:      API_BASE=http://localhost:${BACKEND_PORT} node scripts/seed.js"
echo "   Ver logs:           docker compose logs -f"
echo "================================================================"
