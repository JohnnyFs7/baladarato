@echo off
cd /d "%~dp0"
title Balada dos Ratos - ponte com o TikTok
if not exist node_modules (echo Instalando... & call npm install)
if not exist .env (copy .env.exemplo .env >nul & echo Criei o arquivo .env: preencha seu usuario e sua chave e abra de novo. & notepad .env & pause & exit /b)
start "" http://localhost:8080
node servidor.js
pause
