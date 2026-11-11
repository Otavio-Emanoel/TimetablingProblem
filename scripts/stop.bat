@echo off
REM Wrapper Batch para executar o script PowerShell de parada no Windows
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop.ps1" %*
