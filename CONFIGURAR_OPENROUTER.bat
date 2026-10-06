@echo off
setlocal
cd /d "%~dp0"

echo ================================================
echo   EL SOTANO DE OSITO - CONFIGURAR OPENROUTER
echo ================================================
echo.
echo Esta ventana te pedira tu clave de OpenRouter.
echo La clave se guardara solamente en .env y .env esta
echo excluido de Git para evitar subirla por accidente.
echo.
set /p "ORKEY=PEGA AQUI TU API KEY DE OPENROUTER: "
if "%ORKEY%"=="" (
  echo.
  echo No se introdujo ninguna clave.
  pause
  exit /b 1
)
> .env echo OPENROUTER_API_KEY=%ORKEY%
>>.env echo OPENROUTER_MODEL=openrouter/free
>>.env echo OPENROUTER_X_TITLE=El Sótano de Osito
>>.env echo IA_MAX_POR_DIA_TOTAL=50
>>.env echo IA_MAX_POR_DIA_IP=50
>>.env echo IA_MAX_POR_MINUTO=20

echo.
echo Configuracion guardada en .env.
echo.
if not exist node_modules (
  echo Instalando dependencias por primera vez...
  call npm install
  if errorlevel 1 (
    echo.
    echo No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando El Sotano de Osito...
echo Cuando aparezca el servidor, abre http://localhost:3000
node server.js
pause
