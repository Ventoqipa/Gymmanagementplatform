# Contrato Access Gateway — Enrolamiento Face ID

Contrato entre **Elite Web** y el **Access Gateway** (LAN del gym).  
Equivalente de negocio al wizard XCore `REGISTRAR CLIENTE` → Tomar Foto / biométrico → sync SpeedFace.

**Última actualización:** agosto 2026  
**Sitio de referencia:** Elite Gym · PanelZKTeco en `192.168.1.22`

---

## 1. Actores

| Actor | Rol |
|-------|-----|
| Elite Web | UI Members paso 3 / Access Control; llama solo al Gateway |
| Access Gateway | Servicio en LAN; habla ADMS con SpeedFace; opcionalmente Catálogo |
| SpeedFace-V5L | Terminal física (captura / plantilla) |
| API Catálogo | Persiste `faceID` (Elite o Gateway) |

Elite **no** llama a `192.168.1.22` ni a PanelZKTeco desde Neubox.

---

## 2. Dispositivos (inventario confirmado)

| `terminalId` (Elite) | Serial ZKTeco | Modelo | Notas |
|----------------------|---------------|--------|--------|
| `TRN-MAIN-01` | `SYZ8244300163` | SpeedFace-V5L | Confirmar ubicación (principal/lateral) |
| `TRN-MAIN-02` | `SYZ8244300350` | SpeedFace-V5L | Confirmar ubicación |

- Servidor ADMS / PanelZKTeco: **`192.168.1.22`**
- Protocolo: **ADMS PUSH** (`CDATA RECIBIDO` observado)
- Salida torniquete: **Wiegand 26**

---

## 3. Momento de negocio (paridad XCore)

```text
XCore:  REGISTRAR CLIENTE (wizard) → Tomar Foto / huellas → Finalizar
Elite:  Members paso 1–2 (alta+cobro) → paso 3 Face ID → resumen
```

Omitir Face ID en Elite = equivalente a **Omitir** biométrico en XCore (socio queda `PENDIENTE`).

---

## 4. Endpoint de enrolamiento

### `POST /v1/biometric/enroll`

Orden remota: poner el terminal en registro facial para un miembro ya creado en Catálogo.

#### Headers

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token-servicio>   # recomendado en Gateway
X-Request-Id: <uuid>                     # opcional, correlación
```

#### Request body

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

| Campo | Tipo | Req. | Descripción |
|-------|------|------|-------------|
| `terminalId` | string | sí | ID lógico Elite (`TRN-MAIN-01` / `02`) |
| `memberId` | string | sí | ID app, formato `CLI-{clientID}` |
| `displayName` | string | no | Nombre a mostrar en terminal |
| `clientId` | number | no | Numérico Catálogo; si falta, Gateway lo deriva de `memberId` |
| `pin` | string | no | PIN en dispositivo; default = `String(clientId)` |
| `timeoutSeconds` | number | no | Espera máxima de captura; default **120** |

#### Response `200 OK`

```json
{
  "ok": true,
  "templateId": "tmpl_CLI123_a1b2c3",
  "vendorRequestId": "fv_enroll_x9y8z7",
  "qualityScore": 0.94,
  "latencyMs": 8200,
  "terminalId": "TRN-MAIN-01",
  "deviceSerial": "SYZ8244300163",
  "pin": "123",
  "enrolledAtIso": "2026-08-20T20:15:00.000Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ok` | boolean | `true` si enroll completado |
| `templateId` | string | ID de plantilla; Elite lo guarda como **`faceID`** en Catálogo |
| `vendorRequestId` | string | ID de correlación Gateway/ADMS |
| `qualityScore` | number | 0–1; mínimo aceptable sugerido **≥ 0.85** |
| `latencyMs` | number | Tiempo total del enroll |
| `terminalId` | string | Eco del request |
| `deviceSerial` | string | SN ZKTeco resuelto |
| `pin` | string | PIN usado en dispositivo |
| `enrolledAtIso` | string | ISO-8601 UTC |

#### Errores

| HTTP | `code` | Cuándo |
|------|--------|--------|
| 400 | `INVALID_REQUEST` | Body inválido / `memberId` mal formado |
| 404 | `TERMINAL_NOT_FOUND` | `terminalId` no mapeado |
| 408 | `CAPTURE_TIMEOUT` | Socio no se presentó a tiempo |
| 409 | `ALREADY_ENROLLED` | Ya hay plantilla (opcional: forzar re-enroll) |
| 502 | `DEVICE_OFFLINE` | SpeedFace no ONLINE |
| 503 | `ADMS_UNAVAILABLE` | Panel/Gateway ADMS caído |
| 422 | `LOW_QUALITY` | `qualityScore` por debajo del umbral |

Cuerpo de error:

```json
{
  "ok": false,
  "code": "DEVICE_OFFLINE",
  "message": "SpeedFace SYZ8244300163 no está ONLINE",
  "vendorRequestId": "fv_enroll_x9y8z7",
  "terminalId": "TRN-MAIN-01"
}
```

---

## 5. Quién escribe el Catálogo

**Opción adoptada (Elite):**

1. Gateway responde `templateId`.
2. Elite hace `PUT Client/Update` con `faceID = templateId` (y `memberID = pin` si aplica).
3. Si el Update falla pero el enroll OK → UI de **reintento solo Catálogo** (no re-capturar).

**Opción alternativa (Gateway):** el Gateway también llama Catálogo; Elite solo refresca. No usar ambas a la vez sin idempotencia.

---

## 6. Semántica en dispositivo (Gateway)

1. Resolver `terminalId` → `deviceSerial`.
2. Crear/actualizar usuario ADMS: `PIN = pin`, `Name = displayName`.
3. Iniciar captura facial remota (o modo enroll en terminal).
4. Esperar plantilla / ACK (`timeoutSeconds`).
5. Validar `qualityScore ≥ 0.85` (configurable).
6. Responder a Elite.

Paridad XCore: mismo momento de negocio que el wizard; distinto transporte (HTTP Gateway vs UI desktop).

---

## 7. Configuración Elite

```env
# Vacío o ausente → mock local (desarrollo)
VITE_ACCESS_GATEWAY_URL=https://gateway.elite-gym.local
```

- Base URL **sin** slash final.
- Path fijo: `{VITE_ACCESS_GATEWAY_URL}/v1/biometric/enroll`.
- Override en runtime (pruebas): `localStorage.setItem("elite_access_gateway_url", "https://…")`.
- Guía AnyDesk + Neubox: [PRUEBA-ENROLAMIENTO-ANYDESK.md](./PRUEBA-ENROLAMIENTO-ANYDESK.md).

---

## 8. Tipos TypeScript (fuente en código)

Ver:

- [`src/app/core/accessGateway/types.ts`](../src/app/core/accessGateway/types.ts)
- [`src/app/core/accessGateway/client.ts`](../src/app/core/accessGateway/client.ts)
- [`src/app/config/accessGateway.ts`](../src/app/config/accessGateway.ts)

---

## 9. Endpoints relacionados (mismo Gateway, fuera de este corte)

| Método | Path | Uso |
|--------|------|-----|
| `POST` | `/v1/biometric/verify` | Match en acceso (Flujo 1) |
| `POST` | `/v1/turnstile/command` | OPEN / CLOSE / HOLD |
| `GET` | `/v1/terminals` | Lista ONLINE + serial |

El enrolamiento de producto **solo requiere** `/v1/biometric/enroll` + persistencia `faceID`.
