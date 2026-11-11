@echo off
REM Wrapper Batch para executar o script PowerShell de inicialização no Windows
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
