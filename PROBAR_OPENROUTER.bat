@echo off
setlocal
cd /d "%~dp0"
if not exist .env (
  echo Falta el archivo .env con OPENROUTER_API_KEY.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)
echo.
echo Iniciando servidor en http://localhost:3000 ...
echo.
start "" "http://localhost:3000/api/ia/estado?probar=1"
node server.js
pause
