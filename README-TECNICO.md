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

`AuthContext` marca `isAuthenticated` en `localStorage`. Es un **placeholder** para demo; no valida credenciales contra un servidor.

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

## Origen del diseño

El bundle proviene del diseño **Gym Management Platform** en Figma (referencia en el `README.md` raíz). Las páginas bajo `src/app/pages` son la capa funcional del demo cliente.
