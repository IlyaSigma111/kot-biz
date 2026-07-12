#!/usr/bin/env pwsh
# Business Cats — Standalone WebSocket Server
# Запуск: .\server.ps1

$port = 9001
Write-Host "🐱 Business Cats Server" -ForegroundColor Magenta
Write-Host "Порт: $port" -ForegroundColor Cyan
Write-Host "Откройте на телефонах: http://$($env:COMPUTERNAME):$port/player" -ForegroundColor Green
Write-Host ""

# Check if Node.js is available
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "Запуск через Node.js..." -ForegroundColor Yellow
    node server.js
} else {
    Write-Host "Node.js не найден. Установите Node.js или используйте Tauri-приложение." -ForegroundColor Red
    Write-Host "Скачать: https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Нажмите Enter для выхода"
}
