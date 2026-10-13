@echo off
cd /d "%~dp0"
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8081"
echo Madeireiro Brazil Wood rodando em http://localhost:8081 - feche esta janela para parar.
node servir.js
