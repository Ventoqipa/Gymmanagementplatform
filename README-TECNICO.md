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
  features/pos/          # Módulo POS reutilizable (REST + UI); ver features/pos/README.md
  app/lib/
    demoStore.ts         # Estado en memoria: pagos, accesos, torniquetes (ventas POS → features/pos)
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

## Datos e integraciones mock

### `demoStore.ts`

- **`MembershipPayment`**: pagos de membresía; se listan en **Members** y **Reports**.
- **`AccessLogEntry`**: eventos de acceso tras simulación; compartidos con **Reports**.
- **`TurnstileState`**: estado por terminal actualizado al simular flujo de acceso.
- Ventas POS: módulo **`src/features/pos`** (REST Neubox + fallback memoria). **Reports → Punto de venta** llama `getPosSalesToday()`.

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
