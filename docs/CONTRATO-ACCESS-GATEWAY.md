# Contrato Access Gateway — Elite + ADMS

Contrato entre **Elite Web** y el **Access Gateway** (LAN del gym).  
El Gateway es el servidor **ADMS** de los SpeedFace-V5L.

**Última actualización:** septiembre 2026  
**Sitio:** Elite Gym · Gateway en PC LAN (ej. `192.168.1.22`)

---

## 1. Actores

| Actor | Rol |
|-------|-----|
| Elite Web | UI Miembros / Control de acceso; llama solo al Gateway |
| Access Gateway | ADMS + API `/v1/*`; habla con SpeedFace |
| SpeedFace-V5L | Terminal (captura / plantilla / Wiegand al torniquete) |
| API Catálogo | Persiste `faceID` (Elite escribe tras enroll) |

Elite **no** llama a los lectores desde Neubox: solo al Gateway (navegador en LAN o URL alcanzable).

---

## 2. Dispositivos

| `terminalId` | Serial | Modelo |
|--------------|--------|--------|
| `TRN-MAIN-01` | `SYZ8244300163` | SpeedFace-V5L |
| `TRN-MAIN-02` | `SYZ8244300350` | SpeedFace-V5L |

- Servidor ADMS: Access Gateway puerto **8096**
- API Elite: puerto **8787**
- Torniquete: **Wiegand 26** desde el lector

---

## 3. Momento de negocio

```text
Elite:  Miembros pasos 1–2 (alta+cobro) → paso 3 Face ID → resumen
```

Omitir Face ID = socio sin plantilla en lector (queda pendiente de enrolar).

---

## 4. Endpoint de enrolamiento

### `POST /v1/biometric/enroll`

Headers: `Content-Type: application/json`, `Accept: application/json`

```json
{
  "terminalId": "TRN-MAIN-01",
  "memberId": "CLI-123",
  "displayName": "Jennifer Salas",
  "clientId": 123,
  "pin": "123",
  "timeoutSeconds": 120
}
```

Respuesta 200: `ok`, `templateId` (→ Catálogo `faceID`), `qualityScore`, `deviceSerial`, `pin`, etc.

Errores: `DEVICE_OFFLINE`, `CAPTURE_TIMEOUT`, `TERMINAL_NOT_FOUND`, …

Tras enroll OK, Elite hace update de Catálogo con `faceID = templateId`.

---

## 5. Accesos y monitor

| Método | Path | Uso |
|--------|------|-----|
| `GET` | `/v1/events` | Muro de accesos (polling) |
| `GET` | `/v1/events/stream` | SSE opcional |
| `POST` | `/v1/biometric/verify` | Esperar próximo ATTLOG en un terminal |
| `POST` | `/v1/turnstile/command` | Registro de intención; apertura física = Wiegand del lector |
| `GET` | `/v1/terminals` | ONLINE por SN |

---

## 6. Configuración Elite

```env
# Opcional en build; en gym suele usarse localStorage:
# VITE_ACCESS_GATEWAY_URL=http://127.0.0.1:8787
```

Runtime:

```js
localStorage.setItem("elite_access_gateway_url", "http://127.0.0.1:8787");
```

Manual admin: [MANUAL-ADMIN-ACCESO.md](./MANUAL-ADMIN-ACCESO.md)  
Cutover: [CUTOVER-ADMS-DIRECTO.md](./CUTOVER-ADMS-DIRECTO.md)

Código: `src/app/core/accessGateway/`
