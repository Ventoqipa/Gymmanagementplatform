# Integración backend — Bitácora de accesos (ADMS → Gateway → API)

Documento para el **backend / API Tanosi** (o servicio de bitácora).  
Describe qué consumir del Access Gateway y qué persistir.

**Gateway (PC del gym):** `http://127.0.0.1:8787` (API Elite)  
**ADMS (lectores):** puerto `8096` (solo el Gateway; el backend **no** habla ADMS directo)

---

## 1. Flujo

```text
SpeedFace reconoce socio
    → ADMS ATTLOG (+ opcional ATTPHOTO) al Gateway :8096
    → Gateway normaliza a JSON (evento)
    → Backend / Elite lee GET /v1/events (o SSE)
    → Backend persiste bitácora durable
```

El reconocimiento y la apertura del torniquete ocurren en el **lector** (Wiegand).  
El backend solo **registra** el acceso a partir del evento del Gateway.

---

## 2. Endpoint a consumir

### `GET /v1/events`

Base: `{GATEWAY_URL}/v1/events`

| Query | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `limit` | number | 30 | Máx. eventos (tope ~50 en Gateway) |
| `since` | ISO-8601 | — | Solo eventos con `timestampIso` posterior |

**Ejemplo**

```http
GET http://127.0.0.1:8787/v1/events?limit=50
Accept: application/json
```

**Respuesta 200**

```json
{
  "ok": true,
  "events": [
    {
      "id": "ACC-1727199912000-a1b2c",
      "timestampIso": "2026-09-24T19:05:12.000Z",
      "memberId": "CLI-123",
      "memberName": "CLI-123",
      "tier": "ACCESS",
      "result": "GRANTED",
      "reason": null,
      "terminalId": "TRN-MAIN-01",
      "deviceSerial": "SYZ8244300163",
      "confidence": 0.95,
      "captureSnapshotUrl": "data:image/jpeg;base64,/9j/…",
      "faceIdVendorRequestId": "att_123_xxxx",
      "turnstileVendorCommandId": "wiegand_status_0",
      "source": "adms"
    }
  ]
}
```

### Opcional: `GET /v1/events/stream` (SSE)

```http
GET http://127.0.0.1:8787/v1/events/stream
Accept: text/event-stream
```

Eventos SSE:

```text
event: access
data: { …mismo objeto evento… }
```

Útil para push en tiempo real hacia el backend (si el backend corre en la misma LAN o tiene túnel al Gateway).

---

## 3. Contrato del evento (campos)

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | string | sí | Id único del evento. Usar para **idempotencia** al insertar en BD. |
| `timestampIso` | string (ISO-8601) | sí | Momento del acceso (UTC recomendado). |
| `memberId` | string | sí* | Formato `CLI-{pin}`. El `pin` es el user ID en el SpeedFace (= `clientId` del catálogo). |
| `memberName` | string | sí | Hoy suele igualar a `memberId`; enriquecer con nombre real vía Catálogo. |
| `tier` | string | no | En ADMS suele venir `"ACCESS"`. |
| `result` | `"GRANTED"` \| `"DENIED"` | sí | Resultado del acceso. |
| `reason` | string \| null | no | Motivo si `DENIED`. |
| `terminalId` | string | sí | `TRN-MAIN-01` / `TRN-MAIN-02` (o `SN-…` si no está mapeado). |
| `deviceSerial` | string | no | Serial físico del SpeedFace. |
| `confidence` | number 0–1 | no | Aprox. según verify del ATTLOG. |
| `captureSnapshotUrl` | string \| null | no | Data URL JPEG o URL; puede llegar **después** del ATTLOG (ATTPHOTO). |
| `faceIdVendorRequestId` | string | no | Traza del evento ADMS. |
| `turnstileVendorCommandId` | string | no | Incluye status Wiegand del ATTLOG. |
| `source` | string | sí | Accesos reales: `"adms"`. |

\*Si solo llega foto sin PIN parseable, `memberId` puede faltar; filtrar o tratar como captura anónima.

---

## 4. Cómo llega la info del ADMS (ejemplo completo)

El backend **no** consume ADMS directo. Esto muestra qué recibe el Gateway del SpeedFace y cómo lo convierte al JSON de `/v1/events`.

### 4.1 Request ADMS crudo (SpeedFace → Gateway :8096)

Cuando un socio es reconocido, el lector hace un POST similar a:

```http
POST /iclock/cdata?SN=SYZ8244300163&table=ATTLOG HTTP/1.1
Host: 192.168.1.22:8096
Content-Type: text/plain

123	2026-09-24 13:05:12	0	15
```

- `SN` = serial del dispositivo  
- `table=ATTLOG` = registro de asistencia/acceso  
- Body = una o más líneas separadas por tab (`\t`)

**Formato de cada línea ATTLOG:**

```text
{PIN}\t{YYYY-MM-DD HH:MM:SS}\t{STATUS}\t{VERIFY}[\t{WORKCODE}]
```

| Parte | Ejemplo | Significado |
|-------|---------|-------------|
| PIN | `123` | Usuario en el lector (= `clientId` / `memberID` en catálogo) |
| Fecha/hora | `2026-09-24 13:05:12` | Hora del acceso en el dispositivo |
| STATUS | `0` | Código de estado / Wiegand |
| VERIFY | `15` | Tipo de verificación (ej. facial) |

Varias líneas en el mismo body = varios accesos:

```text
123	2026-09-24 13:05:12	0	15
456	2026-09-24 13:05:40	0	15
```

### 4.2 Foto opcional (ATTPHOTO)

Después (o aparte) el lector puede enviar la captura:

```http
POST /iclock/cdata?SN=SYZ8244300163&table=ATTPHOTO&PIN=123 HTTP/1.1
Host: 192.168.1.22:8096
Content-Type: text/plain

PIN=123	SN=SYZ8244300163	size=20480	photo=/9j/4AAQSkZJRgABAQ…
```

El Gateway adjunta esa imagen al último evento del mismo PIN/terminal como `captureSnapshotUrl` (`data:image/jpeg;base64,…`).

### 4.3 Lo que el Gateway publica para el backend

Del ATTLOG del ejemplo (`PIN=123`, SN `SYZ8244300163`), `/v1/events` entrega:

```json
{
  "id": "ACC-1727199912000-a1b2c",
  "timestampIso": "2026-09-24T19:05:12.000Z",
  "memberId": "CLI-123",
  "memberName": "CLI-123",
  "tier": "ACCESS",
  "result": "GRANTED",
  "terminalId": "TRN-MAIN-01",
  "deviceSerial": "SYZ8244300163",
  "confidence": 0.95,
  "captureSnapshotUrl": "data:image/jpeg;base64,…",
  "faceIdVendorRequestId": "att_123_xxxx",
  "turnstileVendorCommandId": "wiegand_status_0",
  "source": "adms"
}
```

### 4.4 Tabla de mapeo

| Origen ADMS | Campo en evento (`/v1/events`) |
|-------------|-------------------------------|
| Query `SN` | `deviceSerial` + `terminalId` (por mapa) |
| PIN | `memberId` = `"CLI-" + PIN` |
| Fecha/hora | `timestampIso` (ISO UTC) |
| STATUS | `turnstileVendorCommandId` = `wiegand_status_{STATUS}` |
| VERIFY (si hay valor) | `confidence` ≈ `0.95` |
| ATTPHOTO | `captureSnapshotUrl` |

### 4.5 Mapa de terminales

| `terminalId` | `deviceSerial` | Ubicación |
|--------------|----------------|-----------|
| `TRN-MAIN-01` | `SYZ8244300163` | Entrada principal |
| `TRN-MAIN-02` | `SYZ8244300350` | Entrada lateral |

**Para bitácora en backend:** usar solo el JSON de la sección 4.3 (vía `GET /v1/events`), no el POST crudo a `/iclock/cdata`.

---

## 5. Qué persistir en bitácora (recomendado)

Tabla / documento sugerido por acceso:

```json
{
  "eventId": "ACC-1727199912000-a1b2c",
  "clientId": 123,
  "memberId": "CLI-123",
  "memberName": "Jennifer Salas",
  "occurredAt": "2026-09-24T19:05:12.000Z",
  "result": "GRANTED",
  "reason": null,
  "terminalId": "TRN-MAIN-01",
  "deviceSerial": "SYZ8244300163",
  "confidence": 0.95,
  "snapshotUrl": null,
  "vendorRequestId": "att_123_xxxx",
  "source": "adms",
  "ingestedAt": "2026-09-24T19:05:13.100Z"
}
```

### Reglas

1. **Idempotencia:** unique index en `eventId` (`events[].id`). Si ya existe, no duplicar.
2. **`clientId`:** parsear `memberId` con `/^CLI-(\d+)$/i` → número.
3. **Nombre:** resolver con Catálogo `Client/GetData/{clientId}` (opcional, enriquecimiento).
4. **Foto:** si `captureSnapshotUrl` es `data:image/...`, subir a storage y guardar URL pública; o guardar referencia. Puede actualizarse en un poll posterior del mismo `eventId` / mismo PIN+terminal cercano en tiempo.
5. **Fuente de verdad:** solo eventos con `source === "adms"` (o todos los de `/v1/events` del Gateway productivo).

---

## 6. Estrategia de ingesta

El Gateway guarda ~**200 eventos en memoria**. No es bitácora durable.

Opciones:

| Modo | Cómo |
|------|------|
| Polling | Cada 2–5 s: `GET /v1/events?limit=50` (o `since=` última marca) e insertar nuevos `id` |
| SSE | Suscribirse a `/v1/events/stream` e insertar cada `event: access` |
| Bridge | Proceso en el PC del gym que lea el Gateway y POST a la API cloud |

Ejemplo de payload hacia tu API (si el bridge reenvía):

```http
POST /api/access-log
Content-Type: application/json
```

```json
{
  "eventId": "ACC-1727199912000-a1b2c",
  "clientId": 123,
  "memberId": "CLI-123",
  "occurredAt": "2026-09-24T19:05:12.000Z",
  "result": "GRANTED",
  "terminalId": "TRN-MAIN-01",
  "deviceSerial": "SYZ8244300163",
  "source": "adms"
}
```

---

## 7. Endpoints relacionados (no son bitácora, pero contexto)

| Método | Path | Uso |
|--------|------|-----|
| `GET` | `/health` | Gateway vivo |
| `GET` | `/v1/terminals` | Lectores online/offline |
| `POST` | `/v1/biometric/enroll` | Enrolamiento Face ID (devuelve `templateId`) |
| `POST` | `/v1/biometric/verify` | Long-poll del próximo ATTLOG en un terminal |
| `POST` | `/v1/reconnect` | Sesión Elite ↔ Gateway |

### Enrolamiento → Catálogo (marcar Face ID hecho)

Tras `POST /v1/biometric/enroll` OK:

```json
{
  "ok": true,
  "templateId": "enroll_123_xxxx",
  "pin": "123",
  "terminalId": "TRN-MAIN-01"
}
```

Persistir en Catálogo del cliente:

- `faceID` = `templateId`
- `memberID` = `pin` (mismo que PIN en dispositivo / `clientId`)

Sin ese update, el backend/Catálogo no sabe que el socio ya enroló.

---

## 8. Health del Gateway

```http
GET /health
```

```json
{
  "ok": true,
  "service": "access-gateway",
  "mode": "production",
  "simulateAccess": false,
  "admsPort": 8096,
  "elitePort": 8787,
  "terminals": [ … ],
  "devicesOnline": 2,
  "eventsCount": 14
}
```

Si `ok !== true` o no hay respuesta: no hay eventos nuevos confiables.

---

## 9. Checklist backend

- [ ] Cliente HTTP hacia Gateway (`VITE`/env o IP LAN del PC gym)
- [ ] Poll o SSE de `/v1/events`
- [ ] Insert idempotente por `eventId`
- [ ] Derivar `clientId` de `memberId`
- [ ] (Opcional) Enriquecer nombre desde Catálogo
- [ ] (Opcional) Persistir / subir `captureSnapshotUrl`
- [ ] No depender de la memoria del Gateway como archivo histórico

---

## 10. Referencias

- Contrato Elite ↔ Gateway: [CONTRATO-ACCESS-GATEWAY.md](./CONTRATO-ACCESS-GATEWAY.md)
- Cutover / puertos: [CUTOVER-ADMS-DIRECTO.md](./CUTOVER-ADMS-DIRECTO.md)
- Código Gateway: `tools/access-gateway/` (`adms.mjs` → `handleAttLog`, `makeEvent`)
