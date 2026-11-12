# Access Gateway — ADMS + Elite

SpeedFace → este servicio (**8096**). Elite → API (**8787**).

## Arranque Windows

**Recomendado (sin .bat diario):** una sola vez `install-autostart.bat`  
→ el Gateway arranca al iniciar sesión. Quitar: `uninstall-autostart.bat`.

**Manual / pruebas:** `start-gateway.bat`

Si 8096 está ocupado, cierra el otro programa que use ese puerto.

Chequeo: Elite → **Configuración** → Reconectar / diagnóstico, o http://127.0.0.1:8787/health

## Docs

- Manual admin: [docs/MANUAL-ADMIN-ACCESO.md](../../docs/MANUAL-ADMIN-ACCESO.md)
- Cutover: [docs/CUTOVER-ADMS-DIRECTO.md](../../docs/CUTOVER-ADMS-DIRECTO.md)

## Lectores (detección automática)

Cualquier SpeedFace que haga ADMS PUSH a este PC se registra solo (`TRN-<SERIE>`, nombre “Lector N”)
y se guarda en `terminals.json` (junto a `server.mjs`). El nombre se edita desde Elite → **Configuración**.

| terminalId | SN | Nombre inicial |
|------------|-----|----------------|
| TRN-MAIN-01 | SYZ8244300163 | Entrada principal |
| TRN-MAIN-02 | SYZ8244300350 | Entrada lateral |

API: `GET /v1/terminals`, `POST /v1/terminals/rename { terminalId, label }`,
`POST /v1/terminals/remove { terminalId }` (solo lectores desconectados),
`GET /v1/adms/trace` (traza cruda ADMS: method, path, table, bytes, JPEG, preview).
Query: `?limit=80&only=data|photo&noise=0`.
Ruta alternativa del archivo: variable `TERMINALS_FILE`.

En Elite → **Configuración** → pestaña **Traza ADMS** (filtros Solo datos / Fotos / Todo).

## Fotos de acceso

Cada foto que sube un lector (`ATTPHOTO`, binaria o base64, también `tabledata`/`rtlog` de
firmware de control de acceso) se guarda en `captures/` junto a `server.mjs`
(o en `CAPTURES_DIR`). Se conservan las últimas 300 (`MAX_CAPTURES`).
Si llega un cuerpo que no se puede leer, se guarda una copia en `captures/raw/` para analizarlo.

API: `GET /v1/adms/photos?limit=12` (lista con imagen) y `GET /v1/adms/photos/<id>.jpg`.

Requisitos para que haya foto:

1. El socio está enrolado en ese lector y hace match.
2. En el lector: captura de foto de asistencia activada (tomar y guardar).
3. El lector completó el registro ADMS: en la traza aparecen `push-config` o `ping`,
   no solo `handshake` + `registry` repetidos. Si se repiten, reinicie el lector.

## Elite (PC del gym)

**Configuración → Reconectar** con URL `http://127.0.0.1:8787`  
(no hace falta consola F12; el diagnóstico de puertos está en Elite).
