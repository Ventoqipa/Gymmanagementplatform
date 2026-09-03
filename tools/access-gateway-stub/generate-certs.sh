#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"
echo ""
echo "Listo. Arranca con:"
echo "  ACCESS_GATEWAY_TLS=1 node server.mjs"
echo ""
echo "Luego abre https://127.0.0.1:8787/health y acepta el certificado."
