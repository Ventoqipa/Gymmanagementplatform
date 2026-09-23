# Integración de torniquete

**Relacionado:** [CONTROL-ACCESO-BIOMETRICO.md](./CONTROL-ACCESO-BIOMETRICO.md), [MANUAL-ADMIN-ACCESO.md](./MANUAL-ADMIN-ACCESO.md)

---

## Estado

| Pieza | Estado |
|-------|--------|
| SpeedFace + Wiegand 26 | Hardware en sitio |
| Access Gateway ADMS | `tools/access-gateway` |
| Elite Control de acceso | Monitor + enroll vía Gateway |
| Apertura física | La hace el **lector** al match (Wiegand), no un cable desde Neubox |

---

## Flujo

```text
Match en SpeedFace → Wiegand → torniquete abre
                 └─ ATTLOG/foto → Gateway → Elite monitor
```

`POST /v1/turnstile/command` en Elite registra la intención / prueba; la apertura operativa del acceso diario es local en el SpeedFace.

---

## Checklist

- [ ] Gateway en `:8096` / API `:8787`
- [ ] SpeedFace Cloud Server = PC Gateway
- [ ] Elite `elite_access_gateway_url`
- [ ] Prueba de paso: torniquete + evento en monitor
- [ ] Enrolamiento Face ID desde Miembros
