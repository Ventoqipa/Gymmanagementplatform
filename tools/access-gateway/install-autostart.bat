@echo off
setlocal
cd /d "%~dp0"

echo.
echo === Instalar Access Gateway (arranque automatico) ===
echo.
echo Esto crea una tarea de Windows para que el Gateway
echo arranque solo al iniciar sesion. Despues NO hace falta
echo abrir start-gateway.bat cada dia.
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js no esta en PATH. Instala LTS desde https://nodejs.org
  pause
  exit /b 1
)

set "TASK_NAME=EliteGymAccessGateway"
set "CMD_PATH=%~dp0run-gateway-autostart.cmd"

schtasks /Query /TN "%TASK_NAME%" >nul 2>&1
if not errorlevel 1 (
  echo La tarea ya existe. Se recreara...
  schtasks /Delete /TN "%TASK_NAME%" /F >nul 2>&1
)

schtasks /Create /F /TN "%TASK_NAME%" /SC ONLOGON /RL LIMITED ^
  /TR "\"%CMD_PATH%\"" ^
  /RU "%USERNAME%"

if errorlevel 1 (
  echo.
  echo ERROR: No se pudo crear la tarea. Ejecute este .bat como Administrador
  echo o use start-gateway.bat de forma manual.
  pause
  exit /b 1
)

echo.
echo Tarea creada: %TASK_NAME%
echo Arrancando Gateway ahora...
start "" /MIN "%CMD_PATH%"

echo.
echo Listo. En Elite: Panel -^> Reconectar Elite / ADMS
echo URL: http://127.0.0.1:8787
echo.
echo Para quitar el arranque automatico: uninstall-autostart.bat
echo.
pause
