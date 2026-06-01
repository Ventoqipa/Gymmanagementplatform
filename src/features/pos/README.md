# Módulo POS (reutilizable)

Feature independiente con capa REST, usable en **Elite Gym** y otros proyectos Tanosi.

## Estructura

```
src/features/pos/
  config.ts                 # URL Neubox, tenant, branch
  domain/                   # tipos, IVA, SKU
  api/                      # cliente HTTP + errores
  application/              # PosService, PosRepository
  infrastructure/           # REST, memoria, híbrido
  ui/PosTerminal.tsx        # UI terminal
  index.ts                  # API pública del paquete
```

## Uso en otro proyecto React

```tsx
import { PosTerminal } from "@/features/pos";

export function ShopPage() {
  return <PosTerminal linkedMember={{ memberId: "H251", memberName: "Cliente" }} />;
}
```

```ts
import { posService, getPosSalesToday } from "@/features/pos";

const sales = await getPosSalesToday();
```

## Variables de entorno (Neubox)

| Variable | Descripción |
|----------|-------------|
| `VITE_POS_API_BASE_URL` | Base del API, ej. `https://pos.elitegym247.tanosi.com.mx` |
| `VITE_POS_API_PREFIX` | Prefijo rutas, default `/api/v1` |
| `VITE_POS_TENANT_ID` | Identificador del negocio |
| `VITE_POS_BRANCH_ID` | Sucursal |
| `VITE_POS_USE_MOCK` | `true` = sin HTTP |

En **desarrollo**, si no defines `VITE_POS_API_BASE_URL`, se usa proxy Vite `/pos-api` → Neubox.

## Contrato REST (implementar en backend)

Base: `{VITE_POS_API_BASE_URL}{VITE_POS_API_PREFIX}`

Headers recomendados:

- `Authorization: Bearer {token}` (sesión Tanosi)
- `X-Tenant-Id`, `X-Branch-Id`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/products?search=&category=` | Catálogo |
| POST | `/products` | Alta producto |
| PUT | `/products/{id}` | Edición |
| DELETE | `/products/{id}` | Baja |
| POST | `/sales/checkout` | Cierra venta; body: líneas, pago, IVA, member |
| GET | `/sales/today` | Ventas del día |
| GET | `/sales?from=&to=` | Rango |

Respuesta opcional estilo Tanosi: `{ isResponseSuccessful, data, messageUser, ... }`.

### Checkout — request ejemplo

```json
{
  "lines": [{ "productId": "SUP-001", "quantity": 2, "unitPrice": 45.99 }],
  "paymentMethod": "CARD",
  "ivaRegimen": "general",
  "memberId": "H251",
  "memberName": "Héctor Valle",
  "tenantId": "elite-gym",
  "branchId": 1
}
```

### Checkout — response ejemplo

```json
{
  "isResponseSuccessful": true,
  "data": {
    "sale": { "id": "POS-...", "total": 106.7, "subtotal": 91.98, "tax": 14.72, "method": "CARD", "dateIso": "...", "linesSummary": "...", "ivaRegimen": "general", "ivaRate": 0.16 },
    "receipt": { "id": "TKT-...", "lines": [], "subtotal": 91.98, "tax": 14.72, "total": 106.7, "paymentMethod": "CARD", "ivaRegimen": "general", "ivaRate": 0.16, "ivaLabelShort": "IVA 16%", "createdIso": "..." },
    "products": []
  }
}
```

## Modo híbrido

Si `VITE_POS_USE_MOCK=false` y el API Neubox no responde (red / 5xx), el repositorio **híbrido** usa memoria local para no detener la caja. Errores 4xx (validación, auth) se propagan al usuario.

## DNS Neubox (sugerido)

1. Subdominio `pos.elitegym247.tanosi.com.mx` → hosting del API (.NET o Node).
2. `elitegym247.tanosi.com.mx` → frontend estático (`dist/`).
3. CORS en el API: permitir origen del frontend y credenciales si aplica.
