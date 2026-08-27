# Prueba de enrolamiento Face ID — AnyDesk + Neubox

Guía operativa para probar el flujo Elite → Access Gateway con el sitio en Neubox y el PC del gym vía AnyDesk.

**Plataforma (producción):** [https://elitegym247.tanosi.com.mx/](https://elitegym247.tanosi.com.mx/)  
**Login:** [https://elitegym247.tanosi.com.mx/login](https://elitegym247.tanosi.com.mx/login)

**AnyDesk no es parte de la integración.** Solo te permite entrar al PC del gym para arrancar el Gateway y verificar PanelZKTeco / MySQL.

---

## Qué queda listo en Elite

| Pieza | Estado |
|-------|--------|
| Members paso 3 → `enrollFaceId` | Listo |
| Persistencia `faceID` / `memberID` en Catálogo | Listo |
| Reintento solo Catálogo si enroll OK | Listo |
| Access Control → mismo `enrollFaceId` | Listo |
| Contrato HTTP | `docs/CONTRATO-ACCESS-GATEWAY.md` |
| Stub Gateway (LAN, sin ADMS real) | `tools/access-gateway-stub/server.mjs` |

**Importante:** el stub **no escribe en SpeedFace**. Valida red Elite↔Gateway y el `PUT faceID` al Catálogo. Enrolamiento físico en el lector = siguiente fase (ADMS real).

---

## Arquitectura de la prueba

```text
[ Tú ] --AnyDesk--> [ PC gym 192.168.1.22 ]
                         │
                         ├─ node access-gateway-stub (:8787)
                         ├─ (opcional) cloudflared tunnel → HTTPS
                         └─ PanelZKTeco / XCore / MySQL (verificación)

[ Navegador en PC gym ] → https://elitegym247.tanosi.com.mx (Elite)
        │
        └─ fetch → Access Gateway (stub o túnel HTTPS)
        └─ Catálogo Tanosi (como siempre)
```

Neubox **no** puede hablar directo a `192.168.1.22`. El **navegador** (en el PC del gym, vía AnyDesk) es quien llama al Gateway.

---

## Checklist antes de conectar AnyDesk

1. **Neubox:** build y deploy de Elite con los cambios de enrolamiento a `elitegym247.tanosi.com.mx`.
2. **MySQL / XCore** en el PC del gym: arriba (evitar `Unable to connect to MySQL`).
3. **PanelZKTeco:** terminales ONLINE (`SYZ8244300163`, `SYZ8244300350`).
4. Node.js instalado en el PC del gym (para el stub).

---

## Pasos en la sesión AnyDesk

### 1. Arrancar el stub Gateway

En el PC del gym, desde el repo (o copia del stub):

```bash
node tools/access-gateway-stub/server.mjs
```

Debe mostrar: `Access Gateway STUB escuchando http://0.0.0.0:8787`

Probar en el mismo PC: abrir `http://127.0.0.1:8787/health`

### 2. Exponer HTTPS (obligatorio — Elite es HTTPS)

El navegador bloquea **mixed content** (página HTTPS → API HTTP). Opciones:

**A — Cloudflare Tunnel (recomendado para prueba rápida)**

```bash
cloudflared tunnel --url http://127.0.0.1:8787
```

Copia la URL `https://….trycloudflare.com`.

**B — Build con URL fija** (si tienes hostname HTTPS estable):

```env
VITE_ACCESS_GATEWAY_URL=https://tu-gateway.dominio.com
```

Luego `npm run build` y redeploy a Neubox.

### 3. Apuntar Elite al Gateway (sin rebuild)

En el PC gym, abre [https://elitegym247.tanosi.com.mx/login](https://elitegym247.tanosi.com.mx/login), inicia sesión, abre la consola (F12):

```js
localStorage.setItem(
  "elite_access_gateway_url",
  "https://TU-URL.trycloudflare.com"
);
location.reload();
```

Para volver a mock:

```js
localStorage.removeItem("elite_access_gateway_url");
location.reload();
```

### 4. Enrolar desde Members

1. **Miembros → Nuevo miembro** → pasos 1–2 (alta + cobro).
2. Paso 3 → elige terminal (`TRN-MAIN-01` / `02`) → **Registrar con Face ID**.
3. Esperado:
   - Stub loguea el enroll en la terminal.
   - Elite guarda `faceID` en Catálogo.
   - Resumen muestra Face ID registrado.
4. Si Catálogo falla: botón **Reintentar guardar faceID** (no re-captura).

### 5. Verificar

- Consola stub: línea `[enroll] CLI-… @ TRN-MAIN-01 …`
- Ficha del miembro / ViewAll: campo `faceID` poblado.
- PanelZKTeco: **aún no** habrá usuario nuevo (stub no habla ADMS).

---

## Alternativa sin Neubox (solo LAN)

En el PC gym:

```bash
# .env.local
VITE_ACCESS_GATEWAY_URL=http://127.0.0.1:8787

npm run build
# servir dist/ por HTTP local
```

Así no hay mixed content. Útil si Neubox aún no tiene el build nuevo.

---

## Fallos típicos

| Síntoma | Causa | Qué hacer |
|---------|--------|-----------|
| `NETWORK` / Failed to fetch | Stub apagado o URL mala | `/health` y revisar `localStorage` |
| Mixed content bloqueado | HTTPS→HTTP | Usar cloudflared / HTTPS |
| `TERMINAL_NOT_FOUND` | `terminalId` raro | Solo `TRN-MAIN-01` / `02` |
| Enroll OK, toast catálogo | PUT Client/Update | Reintentar sync; revisar proxy PUT |
| Mock sigue activo | Sin URL gateway | Set `localStorage` o `VITE_ACCESS_GATEWAY_URL` |

---

## Siguiente fase (hardware real)

Implementar en el Gateway real (no stub):

1. ADMS: crear/actualizar usuario (`PIN`, `Name`).
2. Orden de captura facial en SpeedFace.
3. Esperar plantilla + `qualityScore`.
4. Misma respuesta `templateId` → Elite ya sabe persistir `faceID`.
