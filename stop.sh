#!/bin/bash

set -e

echo "🛑 ETEC Timetabling - Script de Parada (Fedora Linux)"
echo "====================================================="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Parar containers
echo "Parando containers Docker..."
docker compose down

print_status "Serviços parados com sucesso"
echo ""
echo "Para iniciar novamente, execute: ./start.sh"