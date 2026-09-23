# Access Gateway — ADMS + Elite

SpeedFace → este servicio (**8096**). Elite → API (**8787**).

## Arranque Windows

**Recomendado (sin .bat diario):** una sola vez `install-autostart.bat`  
→ el Gateway arranca al iniciar sesión. Quitar: `uninstall-autostart.bat`.

**Manual / pruebas:** `start-gateway.bat`

Si 8096 está ocupado, cierra el otro programa que use ese puerto.

Chequeo: Elite → **Panel** → Reconectar / diagnóstico, o http://127.0.0.1:8787/health

## Docs

- Manual admin: [docs/MANUAL-ADMIN-ACCESO.md](../../docs/MANUAL-ADMIN-ACCESO.md)
- Cutover: [docs/CUTOVER-ADMS-DIRECTO.md](../../docs/CUTOVER-ADMS-DIRECTO.md)

## Seriales

| terminalId | SN |
|------------|-----|
| TRN-MAIN-01 | SYZ8244300163 |
| TRN-MAIN-02 | SYZ8244300350 |

## Elite (PC del gym)

**Panel → Reconectar** con URL `http://127.0.0.1:8787`  
(no hace falta consola F12; el diagnóstico de puertos está en Elite).
