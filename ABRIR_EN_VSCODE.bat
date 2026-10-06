@echo off
cd /d "%~dp0"
where code >nul 2>nul
if errorlevel 1 (
  echo VS Code no esta disponible en PATH.
  echo Abre manualmente esta carpeta en VS Code:
  echo %~dp0
  pause
  exit /b 1
)
code "%~dp0"
