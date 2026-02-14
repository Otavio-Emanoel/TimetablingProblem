# ETEC Timetabling - Script de Parada (Windows PowerShell)

$ErrorActionPreference = "Stop"

Write-Host "🛑 ETEC Timetabling - Script de Parada (Windows)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Parando containers Docker..." -ForegroundColor Yellow
docker compose down

Write-Host ""
Write-Host "✓ Serviços parados com sucesso" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar novamente, execute: .\start.ps1" -ForegroundColor White