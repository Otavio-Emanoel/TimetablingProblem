#!/bin/bash

set -e

echo "🚀 ETEC Timetabling - Script de Inicialização (Fedora Linux)"
echo "=========================================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função para imprimir com cor
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Verificar Docker
echo ""
echo "📦 Verificando dependências..."
echo ""

if ! command_exists docker; then
    print_warning "Docker não encontrado. Instalando..."
    sudo dnf install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    print_status "Docker instalado"
else
    print_status "Docker encontrado"
fi

if ! command_exists docker-compose; then
    print_warning "Docker Compose não encontrado. Instalando..."
    sudo dnf install -y docker-compose
    print_status "Docker Compose instalado"
else
    print_status "Docker Compose encontrado"
fi

# 2. Verificar Node.js e npm
if ! command_exists node; then
    print_warning "Node.js não encontrado. Instalando..."
    sudo dnf install -y nodejs npm
    print_status "Node.js e npm instalados"
else
    print_status "Node.js $(node -v) encontrado"
fi

# 3. Verificar Java
if ! command_exists java; then
    print_warning "Java não encontrado. Instalando..."
    sudo dnf install -y java-21-openjdk java-21-openjdk-devel
    print_status "Java 21 instalado"
else
    print_status "Java $(java -version 2>&1 | head -1) encontrado"
fi

# 4. Verificar Maven (somente se necessário rodar localmente)
if [ ! -f "TimetablingBackend/mvnw" ]; then
    print_warning "Maven wrapper não encontrado em TimetablingBackend"
else
    print_status "Maven wrapper encontrado"
fi

# 4b. Build do backend localmente (se o wrapper existir)
if [ -f "TimetablingBackend/mvnw" ]; then
    echo ""
    echo "🔨 Build do Backend (maven)..."
    (cd TimetablingBackend && ./mvnw -q package -DskipTests) && print_status "Backend build concluído" || { print_error "Falha ao buildar backend"; exit 1; }
fi

# 5. Limpar containers antigos
echo ""
echo "🧹 Limpando containers e volumes antigos..."
docker compose down -v 2>/dev/null || true
print_status "Limpeza concluída"

# 6. Instalar dependências do Frontend
echo ""
echo "📦 Instalando dependências do Frontend..."
if [ -d "TimetablingFrontend" ]; then
    cd TimetablingFrontend
    if [ ! -d "node_modules" ]; then
        npm install
        print_status "Dependências do Frontend instaladas"
    else
        print_status "node_modules já existe"
    fi

    # Build do frontend
    echo ""
    echo "🔨 Build do Frontend (Next.js)..."
    (npm run build) && print_status "Frontend build concluído" || { print_error "Falha ao buildar frontend"; exit 1; }
    cd ..
else
    print_error "Diretório TimetablingFrontend não encontrado!"
    exit 1
fi

# 7. Iniciar Docker Compose
echo ""
echo "🐳 Iniciando serviços com Docker Compose (building images)..."
docker compose up -d --build

# Aguardar banco de dados
echo "⏳ Aguardando banco de dados ficar pronto..."
sleep 10

# 8. Executar seed (opcional)
echo ""
read -p "Deseja executar o seed de dados? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    print_warning "Aguardando backend ficar pronto (30 segundos)..."
    sleep 30
    
    if command_exists node; then
        echo "Executando seed.js..."
        node seed.js
        print_status "Seed executado com sucesso"
    else
        print_error "Node.js não encontrado. Pulando seed."
    fi
fi

# 9. Resultado final
echo ""
echo "=========================================================="
echo -e "${GREEN}✓ Serviços iniciados com sucesso!${NC}"
echo ""
echo "📍 URLs de acesso:"
echo "   Backend:  http://localhost:8080"
echo "   Frontend: http://localhost:3000"
echo ""
echo "📝 Próximas etapas:"
echo "   1. Abra http://localhost:3000 no navegador"
echo "   2. Cadastre professores, turmas, horários e demandas"
echo "   3. Clique em 'Rodar Solver Agora' para gerar a grade"
echo ""
echo "Para parar os serviços, execute: ./stop.sh"
echo "=========================================================="