@echo off
cd /d "%~dp0"
title Balada dos Ratos - DEMO no celular (sem TikTok)
if not exist node_modules (echo Instalando... & call npm install)
node servidor.js --demo --celular
pause
