@echo off
setlocal
cd /d "%~dp0"

echo.
echo === Elite Access Gateway (ADMS directo) ===
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js no esta en PATH. Instala LTS desde https://nodejs.org
  pause
  exit /b 1
)

echo Comprobando puerto 8096...
netstat -ano | findstr ":8096" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo.
  echo ADVERTENCIA: Algo ya escucha en 8096.
  echo Cierra el otro programa de acceso que use ese puerto,
  echo luego vuelve a ejecutar este .bat
  echo.
  netstat -ano | findstr ":8096" | findstr "LISTENING"
  echo.
  pause
  exit /b 1
)

set ADMS_PORT=8096
set ELITE_PORT=8787
echo Arrancando...
echo   ADMS  http://0.0.0.0:%ADMS_PORT%
echo   Elite http://0.0.0.0:%ELITE_PORT%/health
echo.
echo Deja esta ventana ABIERTA.
echo.

node server.mjs
pause
