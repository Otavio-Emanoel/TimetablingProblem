# ETEC Timetabling (EtecFlow) - Script de Parada (Windows PowerShell)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

Write-Host "🛑 ETEC Timetabling (EtecFlow) - Script de Parada (Windows)" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Parando containers Docker..." -ForegroundColor Yellow
docker compose down

Write-Host ""
Write-Host "✓ Serviços parados com sucesso" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar novamente, execute: .\scripts\start.ps1 ou .\scripts\start.bat" -ForegroundColor White
