# ETEC Timetabling - Script de Inicialização (Windows PowerShell)

$ErrorActionPreference = "Stop"

Write-Host "🚀 ETEC Timetabling - Script de Inicialização (Windows)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Função para verificar se comando existe
function Test-CommandExists {
    param($command)
    try {
        if (Get-Command $command -ErrorAction Stop) {
            return $true
        }
    }
    catch {
        return $false
    }
}

function Print-Status {
    param($message)
    Write-Host "✓ $message" -ForegroundColor Green
}

function Print-Error {
    param($message)
    Write-Host "✗ $message" -ForegroundColor Red
}

function Print-Warning {
    param($message)
    Write-Host "⚠ $message" -ForegroundColor Yellow
}

# 1. Verificar Docker Desktop
Write-Host ""
Write-Host "📦 Verificando dependências..." -ForegroundColor Cyan
Write-Host ""

if (-not (Test-CommandExists docker)) {
    Print-Warning "Docker não encontrado"
    Write-Host "Por favor, faça download e instale Docker Desktop em: https://www.docker.com/products/docker-desktop"
    Write-Host "Pressione ENTER após instalar e abrir Docker Desktop..."
    Read-Host
    
    if (-not (Test-CommandExists docker)) {
        Print-Error "Docker ainda não está disponível"
        exit 1
    }
} else {
    Print-Status "Docker encontrado"
}

# Verificar se Docker daemon está rodando
try {
    docker ps > $null 2>&1
} catch {
    Print-Error "Docker daemon não está rodando. Abra o Docker Desktop e tente novamente."
    exit 1
}

if (-not (Test-CommandExists docker-compose)) {
    Print-Warning "Docker Compose não encontrado em PATH. Tentando usar docker compose..."
    try {
        docker compose version > $null 2>&1
    } catch {
        Print-Error "Docker Compose não disponível"
        exit 1
    }
}

Print-Status "Docker Compose disponível"

# 2. Verificar Node.js
if (-not (Test-CommandExists node)) {
    Print-Warning "Node.js não encontrado"
    Write-Host "Por favor, faça download em: https://nodejs.org/ (versão LTS)"
    Write-Host "Pressione ENTER após instalar..."
    Read-Host
    
    if (-not (Test-CommandExists node)) {
        Print-Error "Node.js ainda não está disponível"
        exit 1
    }
} else {
    $nodeVersion = node -v
    Print-Status "Node.js $nodeVersion encontrado"
}

# 3. Verificar Git (opcional)
if (-not (Test-CommandExists git)) {
    Print-Warning "Git não encontrado (opcional, mas recomendado)"
    Write-Host "Download em: https://git-scm.com/download/win"
} else {
    Print-Status "Git encontrado"
}

# 4. Limpar containers antigos
Write-Host ""
Write-Host "🧹 Limpando containers e volumes antigos..." -ForegroundColor Cyan

try {
    docker compose down -v -ErrorAction SilentlyContinue
    Print-Status "Limpeza concluída"
} catch {
    Print-Warning "Nenhum container anterior para limpar"
}

# 5. Instalar dependências do Frontend
Write-Host ""
Write-Host "📦 Instalando dependências do Frontend..." -ForegroundColor Cyan

if (Test-Path "TimetablingFrontend") {
    Push-Location TimetablingFrontend
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "npm install em andamento..."
        npm install
        Print-Status "Dependências do Frontend instaladas"
    } else {
        Print-Status "node_modules já existe"
    }
    
    Pop-Location
} else {
    Print-Error "Diretório TimetablingFrontend não encontrado!"
    exit 1
}

# Build do frontend
Write-Host ""
Write-Host "🔨 Build do Frontend (Next.js)..." -ForegroundColor Cyan
Push-Location TimetablingFrontend
try {
    npm run build
    Print-Status "Frontend build concluído"
} catch {
    Print-Error "Falha ao buildar frontend"
    Pop-Location
    exit 1
}
Pop-Location

# 6. Iniciar Docker Compose
Write-Host ""
Write-Host "🐳 Iniciando serviços com Docker Compose..." -ForegroundColor Cyan

# Build do backend (se possível) e start com rebuild das imagens
if (Test-Path "TimetablingBackend\\mvnw.cmd") {
    Write-Host "🔨 Build do Backend (maven)..." -ForegroundColor Cyan
    try {
        & .\TimetablingBackend\mvnw.cmd -q package -DskipTests
        Print-Status "Backend build concluído"
    } catch {
        Print-Error "Falha ao buildar backend"
        exit 1
    }
}

docker compose up -d --build

Print-Status "Containers iniciando..."

# Aguardar banco de dados
Write-Host "⏳ Aguardando banco de dados ficar pronto (30 segundos)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 7. Executar seed (opcional)
Write-Host ""
$response = Read-Host "Deseja executar o seed de dados? (s/n)"

if ($response -eq "s" -or $response -eq "S") {
    Write-Host "⏳ Aguardando backend ficar pronto (30 segundos)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    if (Test-CommandExists node) {
        Write-Host "Executando seed.js..." -ForegroundColor Cyan
        node seed.js
        Print-Status "Seed executado com sucesso"
    } else {
        Print-Error "Node.js não encontrado. Pulando seed."
    }
}

# 8. Resultado final
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Print-Status "Serviços iniciados com sucesso!"
Write-Host ""
Write-Host "📍 URLs de acesso:" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:8080" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "📝 Próximas etapas:" -ForegroundColor Cyan
Write-Host "   1. Abra http://localhost:3000 no navegador" -ForegroundColor White
Write-Host "   2. Cadastre professores, turmas, horários e demandas" -ForegroundColor White
Write-Host "   3. Clique em 'Rodar Solver Agora' para gerar a grade" -ForegroundColor White
Write-Host ""
Write-Host "Para parar os serviços, execute: .\stop.ps1" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green