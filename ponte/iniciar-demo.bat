@echo off
cd /d "%~dp0"
title Balada dos Ratos - DEMO (sem TikTok)
if not exist node_modules (echo Instalando... & call npm install)
start "" http://localhost:8080
node servidor.js --demo
pause
