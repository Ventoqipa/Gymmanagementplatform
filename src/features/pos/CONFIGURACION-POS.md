# Configuración POS — proyecto Elite Gym

El POS es el módulo `src/features/pos/` dentro de la misma app React. **Productos y ventas vienen exclusivamente del POS API** (`/pos-api` → `elitegym247.pos.tanosi.com.mx`), no del catálogo principal Tanosi.

---

## Arquitectura

```
elitegym247.tanosi.com.mx          → App completa (Panel, Miembros, Tienda, Reportes)
elitegym247.pos.tanosi.com.mx      → POS API REST + (opcional) misma app dist/ para vendedores

Dentro de la app (Tienda):
  Productos  → GET  /pos-api/api/v1/products
  Alta/edición → POST/PUT/DELETE /pos-api/api/v1/products[/{id}]
  Checkout   → POST /pos-api/api/v1/sales/checkout
  Ventas     → GET  /pos-api/api/v1/sales[/today]

Login / Miembros (sin cambio):
  SignIn     → /security-api
  Clientes   → /catalog-api
```

| Componente | Rol |
|------------|-----|
| **POS API** | `elitegym247.pos.tanosi.com.mx` vía `/pos-api` — productos y ventas |
| **Security** | `apisecurityegtest.tanosi.com.mx` vía `/security-api` — login |
| **Catalog** | `apicatalogsegtest.tanosi.com.mx` vía `/catalog-api` — solo miembros, no productos POS |
| **Módulo POS** | UI + `RestPosRepository` en `src/features/pos/` |

---

## 1. Variables de entorno

### Producción

```env
VITE_SECURITY_API_URL=/security-api
VITE_CATALOG_API_URL=/catalog-api

VITE_POS_DATA_SOURCE=rest
VITE_POS_API_BASE_URL=/pos-api
VITE_POS_API_KEY=pos-dev-elitegym-temp-2026
VITE_POS_USE_MOCK=false
VITE_POS_BRANCH_ID=1
```

### Desarrollo

```env
VITE_POS_DATA_SOURCE=rest
VITE_POS_API_BASE_URL=/pos-api
VITE_POS_USE_MOCK=false
# VITE_POS_API_PROXY_TARGET=https://elitegym247.pos.tanosi.com.mx
```

Proxies Vite: `/pos-api`, `/security-api`, `/catalog-api` (ver `vite.config.ts`).

---

## 2. Modos de datos (`VITE_POS_DATA_SOURCE`)

| Valor | Descripción |
|-------|-------------|
| `rest` | **Activo.** Productos y ventas solo vía POS API (`RestPosRepository`) |
| `local` | Solo `localStorage`, sin HTTP (pruebas / demo) |
| `hybrid` | REST con fallback a `localStorage` si falla red o 5xx |

---

## 3. Contrato POS API (`rest`)

Implementado en `RestPosRepository`:

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/products` | Listar (`?search=`, `?category=`) |
| `POST` | `/api/v1/products` | Crear producto |
| `PUT` | `/api/v1/products/{id}` | Actualizar |
| `DELETE` | `/api/v1/products/{id}` | Eliminar |
| `POST` | `/api/v1/sales/checkout` | Cobro + ticket |
| `GET` | `/api/v1/sales` | Historial (`?from=`, `?to=`) |
| `GET` | `/api/v1/sales/today` | Ventas del día |

Headers: `X-Api-Key` (o `Authorization: Bearer <apikey>`), `X-Tenant-Id`, `X-Branch-Id`, `Content-Type: application/json`.

Contrato completo: `POSAPIGateway/docs/swagger.json`.

Desde Neubox (mismo origen):

```
GET  https://elitegym247.tanosi.com.mx/pos-api/api/v1/products
POST https://elitegym247.tanosi.com.mx/pos-api/api/v1/sales/checkout
```

---

## 4. Neubox — despliegue

### App React (dominio principal y subdominio caja)

```bash
npm run build
```

Sube `dist/` a `elitegym247.tanosi.com.mx` (y opcionalmente al subdominio POS para URL dedicada de vendedores).

Archivos obligatorios: `index.html`, `web.config`, `api-proxy.php`.

### POS API (backend REST)

El servicio REST debe estar desplegado en `elitegym247.pos.tanosi.com.mx` con las rutas `/api/v1/*`. El proxy PHP del gym reenvía `/pos-api/*` hacia ese host.

- [ ] POS API responde: `GET /api/v1/products`
- [ ] Swagger publicado (p. ej. `/swagger/index.html`) cuando el backend lo exponga
- [ ] SSL en `elitegym247.pos.tanosi.com.mx`
- [ ] Login funcional (`/security-api`)
- [ ] Tienda carga productos desde `/pos-api`

### Proxy PHP (`public/api-proxy.php`)

| `backend` | Target |
|-----------|--------|
| `pos` | `https://elitegym247.pos.tanosi.com.mx` |
| `security` | `https://apisecurityegtest.tanosi.com.mx` |
| `catalog` | `https://apicatalogsegtest.tanosi.com.mx` (miembros, no POS) |

---

## 5. Errores frecuentes

| Síntoma | Causa | Solución |
|---------|-------|----------|
| Tienda vacía / error al cargar | POS API no desplegado o 404 | Desplegar backend en `elitegym247.pos.tanosi.com.mx` |
| 404 en `/pos-api/api/v1/products` | Proxy o API sin rutas | Verificar `web.config`, `api-proxy.php` y backend |
| 401 | API key inválida o ausente | Configurar `VITE_POS_API_KEY` |

---

## Archivos del módulo

```
src/features/pos/
├── api/
│   ├── posEndpoints.ts           # Rutas swagger
│   └── posHttpClient.ts
├── infrastructure/
│   ├── restPosRepository.ts      # POS API (activo)
│   └── hybridPosRepository.ts    # REST + fallback local
├── ui/PosTerminal.tsx
└── CONFIGURACION-POS.md
```

Host (`src/app/config/posHost.ts`):

```ts
export const gymPosConfig = createPosConfig();
```

Variables en `.env`: `VITE_POS_DATA_SOURCE=rest`, `VITE_POS_API_KEY`, `VITE_POS_API_BASE_URL=/pos-api`.
