# Elite Gym 24/7 — Implementación técnica (demo)

## Stack

| Capa | Tecnología |
|------|------------|
| UI | React **18.3** (peer), componentes propios + utilidades estilo **shadcn/radix** importadas al bundle |
| Compilación | **Vite 6.3** (`@vitejs/plugin-react`) |
| Estilos | **Tailwind CSS 4** (`@tailwindcss/vite`) |
| Routing | **React Router 7** (`createBrowserRouter`, `RouterProvider`) |
| Notificaciones | **Sonner** (toasts) |
| Iconos | **Lucide React** |
| Otros (disponibles en `package.json`) | **Recharts**, **React Hook Form**, **MUI**, **Motion**, **date-fns**, etc.; el flujo principal del demo no depende de todos ellos |

No hay **API propia** ni base de datos en este repositorio: la demo corre 100% en el cliente.

## Estructura relevante

```
src/
  app/
    App.tsx              # AuthProvider + Router + Toaster (Sonner)
    routes.tsx           # /login, /, /access-control, /members, /pos, /reports
    context/AuthContext.tsx   # “Login” demo: persiste solo un flag en localStorage
    pages/               # Pantallas usadas en el router
    components/Layout.tsx     # Shell + navegación
  app/lib/
    demoStore.ts         # Estado en memoria: pagos, log de accesos, torniquetes, ventas POS
    thirdPartyMocks.ts   # mockFaceIdVerify / mockTurnstileCommand (sustituir por fetch)
  styles/index.css
  imports/               # Artefactos exportados desde Figma (no usados por todas las rutas)
vite.config.ts           # alias `@` → `./src`, plugin de assets Figma
```

## Autenticación

Inicio de sesión contra el API Tanosi (`POST /api/ge/Security/Access/SignIn`):

- **Caso de uso:** `src/app/core/auth/signInUseCase.ts` (validación de usuario/contraseña, IP, `appID`, `typeAccess`).
- **Cliente HTTP:** `src/app/core/auth/securityApiClient.ts` (errores Tanosi 409 y validación ASP.NET 400).
- **Persistencia:** token y sesión en `localStorage` vía `authStorage.ts`.

Variables opcionales (ver `.env.example`): `VITE_SECURITY_API_URL`, `VITE_APP_ID`, `VITE_TYPE_ACCESS`.

### CORS (Postman funciona, el navegador no)

Los navegadores bloquean peticiones a otro dominio si el API no envía cabeceras CORS. **Postman no aplica esa regla.**

| Entorno | Qué hacer |
|---------|-----------|
| **Desarrollo** | `npm run dev` y **no** definir URLs absolutas en `.env`. El front llama a `/security-api` y `/pos-api`; Vite las reenvía al API real (`vite.config.ts`). Si el proxy devuelve **500** y en consola aparece `ERR_TLS_CERT_ALTNAME_INVALID`, el SSL de Neubox no coincide con el subdominio; el proxy usa `secure: false` solo en dev. En Neubox conviene instalar el certificado para el subdominio real. |
| **Producción** | **Proxy temporal (activo):** `npm run build` + `dist/web.config` reenvía `/security-api` y `/pos-api` al API real en el servidor (mismo dominio del gym → sin CORS ni alerta SSL en el navegador). Ver abajo. |

### Proxy temporal IIS (Neubox) — producción

Mientras el certificado de `apisecurityegtest.tanosi.com.mx` no esté bien en Neubox:

1. **Build** (usa `.env.production` con rutas relativas):
   ```bash
   npm run build
   ```
2. Sube **todo** `dist/` a `elitegym247.tanosi.com.mx` (incluye `web.config` con reglas de proxy).
3. El sitio debe poder ejecutar **PHP** (habitual en Neubox). `dist/api-proxy.php` reenvía POST al API real (evita error **405** de IIS StaticFile cuando no hay ARR).
4. El login llamará a `https://elitegym247.tanosi.com.mx/security-api/api/ge/Security/Access/SignIn` → IIS → `api-proxy.php` → API Tanosi.

Si ves **405 Method Not Allowed** con módulo `StaticFile`, sube de nuevo `dist/` incluyendo `api-proxy.php` y el `web.config` actual. En el panel Neubox activa PHP para el dominio si aplica.

Cuando Neubox tenga SSL correcto en el subdominio del API, puedes quitar el proxy y usar URLs absolutas en `.env.production`.

## Datos e integraciones mock

### `demoStore.ts`

- **`MembershipPayment`**: pagos de membresía; se listan en **Members** y **Reports**.
- **`AccessLogEntry`**: eventos de acceso tras simulación; compartidos con **Reports**.
- **`TurnstileState`**: estado por terminal actualizado al simular flujo de acceso.
- **`PosSale`**: cada checkout en **POS** registra una venta; **Reports → Punto de venta** agrega las del día.

Todo se pierde al **recargar la página** (memoria del navegador).

### `thirdPartyMocks.ts`

- **`mockFaceIdVerify`**: simula `POST` de proveedor FaceID (`FaceIdVerifyRequest` → `FaceIdVerifyResponse`).
- **`mockTurnstileCommand`**: simula comando al torniquete (`TurnstileCommandRequest` → `TurnstileCommandResponse`).

**Migración a producción:** reemplazar el cuerpo de estas funciones por `fetch` (o SDK del proveedor), manteniendo los tipos o adaptándolos al contrato real; actualizar URLs, auth (API key, OAuth, mTLS) y manejo de errores.

## Convenciones de UI

- Tema oscuro corporativo (`#0e0e0e`, `#131313`, acento `#e31e24`).
- Tipografía principal referenciada como **Space Grotesk** (según clases en componentes).

## Scripts

```bash
npm install
npm run dev    # servidor de desarrollo Vite
npm run build  # build de producción en /dist
```

## Rutas en producción (recarga en `/login`, etc.)

La app usa **React Router** en el cliente. Si al recargar `https://tudominio.com/login` aparece **404**, el servidor estático no está devolviendo `index.html` para rutas que no son archivos.

Tras `npm run build`, despliega el contenido de **`dist/`** (incluye reglas copiadas desde `public/`):

| Plataforma | Archivo |
|------------|---------|
| IIS / Azure App Service | `web.config` |
| Apache / cPanel | `.htaccess` |
| Netlify / Cloudflare Pages | `_redirects` |
| Azure Static Web Apps | `staticwebapp.config.json` |
| Vercel | `vercel.json` (raíz del repo) |
| Nginx | ver `nginx.conf.example` |

Sin una de estas reglas, solo funciona la URL raíz (`/`) y la navegación interna; **F5 en `/login` fallará**.

### IIS: error 500 al abrir el sitio

Causas frecuentes:

1. **`mimeMap` duplicado** en `web.config` (ya no se incluye en el del repo).
2. **Módulo URL Rewrite no instalado** en el servidor: el bloque `<rewrite>` provoca 500.19. Instalar [IIS URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite) o desplegar con `public/web.config.minimal` renombrado a `web.config` (solo arregla `/`; para `/login` hace falta URL Rewrite).

Tras `npm run build`, volver a subir **`dist/`** completo, incluido el `web.config` nuevo.

## Origen del diseño

El bundle proviene del diseño **Gym Management Platform** en Figma (referencia en el `README.md` raíz). Las páginas bajo `src/app/pages` son la capa funcional del demo cliente.
