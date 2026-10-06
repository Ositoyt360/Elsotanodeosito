@echo off
cd /d "%~dp0"
echo ===== CARPETA ACTUAL =====
echo %CD%
echo.
echo ===== .env =====
type .env
echo.
echo ===== BUSQUEDA GEMINI =====
findstr /S /I /N "gemini GEMINI" *.* > "%TEMP%\osito_gemini_check.txt" 2>nul
if errorlevel 1 (
  echo OK: no hay referencias de Gemini en los archivos de texto accesibles.
) else (
  type "%TEMP%\osito_gemini_check.txt"
  echo.
  echo NOTA: si aparece node_modules u otra carpeta externa, no forma parte de la IA activa.
)
echo.
pause
