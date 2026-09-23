# Cutover — Access Gateway ADMS + Elite

SpeedFace → **Access Gateway** (puerto 8096) → eventos en **Elite**.

**Gateway:** `tools/access-gateway/`  
**Plataforma:** https://elitegym247.tanosi.com.mx/  
**Manual admin:** [MANUAL-ADMIN-ACCESO.md](./MANUAL-ADMIN-ACCESO.md)

---

## 0. Preparar en el PC del gym

1. Copiar carpeta `access-gateway` (incluye `install-autostart.bat`, `server.mjs`, etc.).
2. Node.js LTS (`node --version`).
3. Deploy de `dist/` en Neubox.

---

## 1. Arrancar Gateway

**Recomendado (una vez):**

```bat
cd C:\ruta\access-gateway
install-autostart.bat
```

**Manual / pruebas:** `start-gateway.bat`

Si **8096 está ocupado**: cerrar el programa que escuche ese puerto y reintentar.

Comprobar: `http://127.0.0.1:8787/health` → `"ok": true`.

---

## 2. Liberar puerto ADMS

1. Cerrar cualquier software anterior de control de acceso que use el puerto **8096**.
2. En Elite: **Panel → Ejecutar diagnóstico**.

---

## 3. Configurar SpeedFace

En cada lector (Comm / Cloud Server / ADMS):

| Campo | Valor |
|--------|--------|
| Server IP | IP del PC del Gateway (ej. `192.168.1.22`) |
| Port | `8096` |

Guardar / reiniciar red. En la consola del Gateway deben aparecer handshakes.

`http://127.0.0.1:8787/v1/terminals` → ambos `online: true`.

---

## 4. Conectar Elite

En el navegador **del mismo PC**, tras login:

```js
localStorage.setItem("elite_access_gateway_url", "http://127.0.0.1:8787");
location.reload();
```

**Control de acceso** → Gateway: **online**.

---

## 5. Pruebas

| # | Acción | OK |
|---|--------|-----|
| 1 | Socio pasa por el lector | Evento en monitor Elite |
| 2 | Torniquete | Abre al reconocer |
| 3 | Alta Face ID | Captura en lector + faceID en catálogo |
| 4 | Esperar acceso en terminal | Long-poll hasta ATTLOG |

---

## Seriales

| terminalId | SN |
|------------|-----|
| TRN-MAIN-01 | SYZ8244300163 |
| TRN-MAIN-02 | SYZ8244300350 |
