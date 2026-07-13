# Integración de torniquete — Pendiente

Documento de trabajo para conectar el **torniquete físico** del gimnasio con la plataforma Elite. La integración **no está activa** en producción; hoy el flujo se simula en la UI.

**Relacionado:** [CONTROL-ACCESO-BIOMETRICO.md](./CONTROL-ACCESO-BIOMETRICO.md) (arquitectura completa FaceID + acceso)

**Última actualización:** julio 2026

---

## Estado actual

| Pieza | Ubicación | Estado |
|-------|-----------|--------|
| Pantalla operación accesos | `src/app/pages/AccessControl.tsx` | UI operativa |
| Comandos torniquete (mock) | `src/app/lib/thirdPartyMocks.ts` → `mockTurnstileCommand` | **Simulado** |
| Log de accesos | `src/app/lib/demoStore.ts` | localStorage |
| Hardware real (Wiegand 26) | Terminal ZKTeco SpeedFace-V5L | **Sin conectar** a Elite |

El mock ejecuta `OPEN` → espera 1.8 s → `CLOSE` cuando hay match facial simulado. **No envía señal al relé ni al controlador Wiegand.**

---

## Hardware en sitio (referencia)

```
SpeedFace-V5L (ZKTeco)
       │
       │  Salida Wiegand 26
       ▼
Controlador de torniquete / relé
       │
       └── Puerta / torniquete físico
```

- Protocolo observado en discovery: **Wiegand 26** desde la terminal.
- Software legacy: **XCore For Gym** + servidor ADMS local (`192.168.1.22:8096`).
- La plataforma Elite **no reemplaza** XCore hasta que exista un **Access Gateway** propio.

---

## Arquitectura objetivo

```
Plataforma Elite (web/escritorio)
        │  HTTPS
        ▼
Access Gateway (servicio local en el gym)
        │
        ├── ADMS PUSH ← SpeedFace-V5L (eventos / enroll)
        ├── Validación vigencia ← API Catálogo Client
        └── Comando torniquete → Wiegand 26 / relé
```

El Gateway es el único componente que debe hablar con el hardware. La web **no** controla el torniquete directamente.

---

## Contrato HTTP previsto (Gateway)

Ya tipado en `thirdPartyMocks.ts` como referencia para la implementación real.

### `POST /v1/turnstile/command`

**Request**

```json
{
  "terminalId": "TRN-MAIN-01",
  "command": "OPEN",
  "correlationId": "fv_req_abc123"
}
```

Comandos: `OPEN` | `CLOSE` | `HOLD`.

**Response**

```json
{
  "accepted": true,
  "vendorCommandId": "ts_cmd_xyz",
  "appliedAtIso": "2026-07-06T18:00:00.000Z"
}
```

### Flujo de negocio (producción)

1. Terminal detecta rostro → evento al Gateway (ADMS push o polling).
2. Gateway identifica `memberId` / `clientID` y consulta **vigencia** en Catálogo (`dateRenewal`).
3. Si vigente → `OPEN` unos segundos → log `GRANTED`.
4. Si vencido / sin match → `HOLD` o no abrir → log `DENIED` con `reason`.

---

## Cambios necesarios en el frontend (cuando exista Gateway)

| Archivo | Cambio |
|---------|--------|
| `thirdPartyMocks.ts` | Sustituir `mockTurnstileCommand` por `fetch` al Gateway |
| `AccessControl.tsx` | Consumir eventos en tiempo real (SSE/WebSocket opcional) |
| `demoStore.ts` | Migrar log a API persistente |
| Variables `.env` | `VITE_ACCESS_GATEWAY_URL` |

Ejemplo de sustitución:

```typescript
// thirdPartyMocks.ts → accessGatewayClient.ts
export async function turnstileCommand(input: TurnstileCommandInput) {
  const res = await fetch(`${gatewayUrl}/v1/turnstile/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Comando de torniquete rechazado");
  return res.json();
}
```

---

## Checklist de integración (futuro)

- [ ] Access Gateway desplegado en LAN del gym
- [ ] Terminal ZKTeco registrada en Gateway (ADMS)
- [ ] Mapeo `faceID` ↔ `clientID` en Catálogo
- [ ] Regla de vigencia (`dateRenewal >= hoy`) antes de `OPEN`
- [ ] Sustituir mocks en `mockFaceIdVerify` y `mockTurnstileCommand`
- [ ] Log de accesos en base de datos (no solo localStorage)
- [ ] Prueba en sitio: apertura física del torniquete
- [ ] Fallback si Gateway cae (modo manual / XCore)

---

## Riesgos y decisiones pendientes

1. **Coexistencia con XCore:** definir si Elite reemplaza XCore o convive durante migración.
2. **Latencia:** el torniquete debe abrir en &lt; 2 s desde la detección facial.
3. **Seguridad LAN:** Gateway solo accesible desde red del gym o VPN.
4. **Auditoría:** cada `OPEN` debe quedar ligado a `faceIdVendorRequestId` y `memberId`.

---

## Referencias en código

- Mock torniquete: `src/app/lib/thirdPartyMocks.ts`
- UI accesos: `src/app/pages/AccessControl.tsx`
- Modelo log: `AccessLogEntry` en `src/app/lib/demoStore.ts`
- Arquitectura biométrica completa: [CONTROL-ACCESO-BIOMETRICO.md](./CONTROL-ACCESO-BIOMETRICO.md)
