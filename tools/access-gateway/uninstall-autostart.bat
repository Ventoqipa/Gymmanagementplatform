@echo off
setlocal
echo.
echo === Quitar arranque automatico Access Gateway ===
echo.
schtasks /Delete /TN "EliteGymAccessGateway" /F
if errorlevel 1 (
  echo No habia tarea o no se pudo borrar.
) else (
  echo Tarea eliminada. El Gateway ya no arrancara solo.
)
echo.
echo Si el proceso sigue en memoria, cierre la ventana minimizada
echo o termine "node.exe" del Access Gateway en el Administrador de tareas.
echo.
pause
