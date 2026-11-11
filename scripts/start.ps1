# ETEC Timetabling (EtecFlow) - Script de Inicialização (Windows PowerShell)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

Write-Host "🚀 ETEC Timetabling (EtecFlow) - Script de Inicialização (Windows)" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

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

Write-Host "📦 Verificando dependências..." -ForegroundColor Cyan
if (-not (Test-CommandExists docker)) {
    Print-Error "Docker não encontrado. Instale o Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
}
Print-Status "Docker encontrado"

try {
    docker ps > $null 2>&1
} catch {
    Print-Error "Docker daemon não está rodando. Abra o Docker Desktop e tente novamente."
    exit 1
}

try {
    docker compose version > $null 2>&1
    Print-Status "Docker Compose disponível"
} catch {
    Print-Error "Docker Compose não disponível"
    exit 1
}

if (Test-CommandExists node) {
    $nodeVersion = node -v
    Print-Status "Node.js $nodeVersion encontrado"
} else {
    Print-Warning "Node.js não encontrado localmente (opcional para seed)"
}

Write-Host ""
Write-Host "🧹 Parando containers anteriores..." -ForegroundColor Cyan
try {
    docker compose down -ErrorAction SilentlyContinue
} catch {}
Print-Status "Limpeza concluída"

Write-Host ""
Write-Host "🐳 Iniciando serviços com Docker Compose..." -ForegroundColor Cyan
docker compose up -d --build

Write-Host "⏳ Aguardando backend ficar pronto em http://localhost:8080/api/health ..." -ForegroundColor Yellow
$maxRetries = 45
$retry = 0
$healthy = $false
while (-not $healthy -and $retry -lt $maxRetries) {
    Start-Sleep -Seconds 2
    $retry++
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            $healthy = $true
        }
    } catch {}
}

if (-not $healthy) {
    Print-Error "Timeout aguardando o backend iniciar. Verifique com: docker compose logs backend"
    exit 1
}
Print-Status "Backend online e saudável!"

Write-Host ""
$response = Read-Host "Deseja executar o seed de dados? (s=padrão / f=completo / m=simples / n=não)"

$seedFile = $null
if ($response -match "^[sS]$") { $seedFile = "scripts/seed.js" }
elseif ($response -match "^[fF]$") { $seedFile = "scripts/seed_full.js" }
elseif ($response -match "^[mM]$") { $seedFile = "scripts/seed-simple.js" }

if ($seedFile) {
    if (Test-CommandExists node) {
        Write-Host "Executando $seedFile..." -ForegroundColor Cyan
        node $seedFile
        Print-Status "Seed executado com sucesso"
    } else {
        Print-Error "Node.js não encontrado. Pulando seed."
    }
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Print-Status "Serviços iniciados com sucesso!"
Write-Host ""
Write-Host "📍 URLs de acesso:" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:8080" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Para parar os serviços, execute: .\scripts\stop.ps1 ou .\scripts\stop.bat" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Green
