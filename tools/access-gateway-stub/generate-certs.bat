@echo off
setlocal
cd /d "%~dp0"
if not exist certs mkdir certs
where openssl >nul 2>&1
if errorlevel 1 (
  echo OpenSSL no esta en PATH. Instala Git for Windows o OpenSSL y vuelve a ejecutar.
  exit /b 1
)
openssl req -x509 -newkey rsa:2048 -keyout certs\key.pem -out certs\cert.pem -days 365 -nodes -subj "/CN=localhost"
echo.
echo Listo. Arranca con:
echo   set ACCESS_GATEWAY_TLS=1
echo   node server.mjs
echo.
echo Luego abre https://127.0.0.1:8787/health y acepta el certificado.
