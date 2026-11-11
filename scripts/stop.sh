#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🛑 ETEC Timetabling (EtecFlow) - Script de Parada"
echo "================================================="

GREEN='\033[0;32m'
NC='\033[0m'

echo "Parando containers Docker..."
docker compose down

echo -e "${GREEN}✓${NC} Serviços parados com sucesso"
echo ""
echo "Para iniciar novamente, execute: ./scripts/start.sh"
