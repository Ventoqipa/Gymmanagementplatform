@echo off
REM Wrapper interno para la tarea programada (no usar a diario).
cd /d "%~dp0"
set ADMS_PORT=8096
set ELITE_PORT=8787
where node >nul 2>&1
if errorlevel 1 (
  echo [%date% %time%] ERROR: Node.js no esta en PATH>> "%~dp0gateway-autostart.log"
  exit /b 1
)
>> "%~dp0gateway-autostart.log" echo [%date% %time%] Arranque Access Gateway
node server.mjs >> "%~dp0gateway-autostart.log" 2>&1
