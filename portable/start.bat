@echo off
title Business Cats Server
echo.
echo   🐱💼 Business Cats — Local Server
echo.
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File server.ps1
pause
