@echo off
cd /d "%~dp0"
echo ================================================
echo   EL SOTANO DE OSITO - OPENROUTER
 echo ================================================
if not exist node_modules echo Instala dependencias con: npm install
if not exist .env (
  echo No existe .env. Abre CONFIGURAR_OPENROUTER.bat primero.
  pause
  exit /b 1
)
call node server.js
