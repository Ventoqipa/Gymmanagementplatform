# Prompt — construir POS API (proyecto aparte)

Copia el bloque **PROMPT** tal cual en un chat nuevo o pásalo al equipo backend. El frontend Elite Gym (`Gymmanagementplatform`) ya tiene el cliente REST implementado (`RestPosRepository`); solo falta este API y desplegarlo.

---

## PROMPT (copiar desde aquí)

```
Construye un API REST para el Punto de Venta (POS) de Elite Gym 24/7. Es un proyecto backend SEPARADO del frontend React. Debe desplegarse en Neubox en:

  https://elitegym247.pos.tanosi.com.mx

El frontend (ya existente) lo consumirá vía proxy en producción:

  https://elitegym247.tanosi.com.mx/pos-api/api/v1/...

NO uses el catálogo principal Tanosi para productos. Este API es la única fuente de productos y ventas del POS.

---

## Stack recomendado

- ASP.NET Core 8 Web API (alineado con APIs Tanosi: Security, Catalog)
- Entity Framework Core + SQL Server (o PostgreSQL si prefieres)
- Swagger/OpenAPI en `/swagger/index.html`
- JWT Bearer — validar el mismo token que emite el Security API Tanosi
- Publicación IIS en Neubox (Windows hosting)

Si usas otro stack (Node/Nest, etc.), respeta EXACTAMENTE el contrato HTTP descrito abajo.

---

## Contexto del ecosistema

| Servicio | URL | Uso |
|----------|-----|-----|
| Frontend gym | elitegym247.tanosi.com.mx | React SPA — módulo Tienda en `/pos` |
| Security API | apisecurityegtest.tanosi.com.mx | Login → Bearer token |
| Catalog API | apicatalogsegtest.tanosi.com.mx | Solo miembros (Client), NO productos POS |
| POS API (este proyecto) | elitegym247.pos.tanosi.com.mx | Productos + ventas |

Login del frontend: POST /security-api/api/ge/Security/Access/SignIn
El token resultante se envía al POS API en header Authorization: Bearer {token}

Headers que el frontend SIEMPRE envía:
- Authorization: Bearer {token}
- Content-Type: application/json
- Accept: application/json
- X-Tenant-Id: elite-gym  (configurable)
- X-Branch-Id: 1           (sucursal)

Filtra productos y ventas por tenantId + branchId (headers o claims del token).

---

## Prefijo base

Todas las rutas bajo: /api/v1

URL completa ejemplo:
  GET https://elitegym247.pos.tanosi.com.mx/api/v1/products

---

## Formato de respuesta

El frontend acepta DOS formatos:

### A) Envelope Tanosi (preferido — igual que Catalog/Security)

```json
{
  "isResponseSuccessful": true,
  "status": 200,
  "statusCode": 200,
  "message": null,
  "messageUser": null,
  "messageTechnical": null,
  "errorNumber": 0,
  "data": { ... payload ... }
}
```

En error:
```json
{
  "isResponseSuccessful": false,
  "status": 400,
  "statusCode": 400,
  "message": "Stock insuficiente",
  "messageUser": "No hay suficiente existencia de ISO WHEY.",
  "messageTechnical": null,
  "errorNumber": 1,
  "data": null
}
```

### B) JSON directo (también funciona)

El cliente desempaqueta solo si detecta isResponseSuccessful. Puedes devolver el payload directo en endpoints simples.

---

## Modelos de dominio (TypeScript del frontend — respetar nombres y tipos)

### PosProduct
```typescript
{
  id: string;        // ej. "SUP-001", "GEAR-002"
  name: string;      // MAYÚSCULAS en UI; backend puede normalizar
  category: string;  // "SUPPLEMENTS" | "GEAR" | "ACCESSORIES"
  price: number;     // MXN, decimal
  stock: number;     // entero >= 0
}
```

Categorías válidas:
- SUPPLEMENTS (prefijo SKU: SUP)
- GEAR (prefijo SKU: GEAR)
- ACCESSORIES (prefijo SKU: ACC)

Generación de SKU si no se envía id al crear:
- SUP-001, SUP-002, GEAR-001, ACC-001, etc.

### PosSale
```typescript
{
  id: string;              // ej. "POS-LK3F2A"
  total: number;
  subtotal: number;
  tax: number;
  method: string;          // "CARD" | "CASH" | "QR"
  dateIso: string;         // ISO 8601
  linesSummary: string;    // ej. "2× ISO WHEY · 1× TOALLA"
  memberId?: string;
  memberName?: string;
  ivaRegimen: "general" | "exento" | "sin_iva";
  ivaRate: number;         // hoy el front usa 0 en todos los regímenes
  lines?: PosSaleLine[];
}
```

### PosSaleLine
```typescript
{
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
```

### PosTicketReceipt (respuesta de checkout)
```typescript
{
  id: string;              // ej. "TKT-LK3F2A"
  lines: PosTicketLine[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  member?: { id?: string; name?: string };
  createdIso: string;
  ivaRegimen: "general" | "exento" | "sin_iva";
  ivaRate: number;
  ivaLabelShort: string;   // "" | "IVA" | "Exento"
}
```

### PosTicketLine
```typescript
{
  name: string;
  id: string;
  qty: number;
  unit: number;
  lineTotal: number;
}
```

---

## Endpoints requeridos

### 1. Listar productos
GET /api/v1/products

Query opcionales:
- search (string) — filtra por nombre o id (case insensitive)
- category (string) — si no es "ALL", filtra por categoría

Response data: PosProduct[]

---

### 2. Crear producto
POST /api/v1/products

Body:
```json
{
  "name": "ISO WHEY",
  "category": "SUPPLEMENTS",
  "price": 899.00,
  "stock": 25,
  "id": "SUP-003",
  "tenantId": "elite-gym",
  "branchId": 1
}
```

- id es opcional; generar SKU si falta
- name → trim + uppercase recomendado
- Validar category enum
- price >= 0, stock >= 0

Response data: PosProduct

---

### 3. Actualizar producto
PUT /api/v1/products/{id}

Body:
```json
{
  "name": "ISO WHEY 2LB",
  "category": "SUPPLEMENTS",
  "price": 949.00,
  "stock": 20
}
```

- id en URL no cambia
Response data: PosProduct
404 si no existe

---

### 4. Eliminar producto
DELETE /api/v1/products/{id}

Response: 204 No Content o envelope con data null
404 si no existe

---

### 5. Checkout (venta)
POST /api/v1/sales/checkout

Body:
```json
{
  "lines": [
    { "productId": "SUP-001", "quantity": 2, "unitPrice": 899.00 }
  ],
  "paymentMethod": "CARD",
  "ivaRegimen": "sin_iva",
  "memberId": "42",
  "memberName": "JUAN PEREZ",
  "tenantId": "elite-gym",
  "branchId": 1
}
```

Reglas de negocio:
1. Validar que cada productId exista
2. Validar stock >= quantity (error 400 con messageUser claro si no alcanza)
3. Descontar stock atómicamente (transacción)
4. Calcular subtotal = sum(quantity * unitPrice), tax según ivaRegimen (rate 0 por ahora), total = subtotal + tax
5. Generar sale.id (POS-...) y receipt.id (TKT-...)
6. Persistir venta con líneas
7. dateIso / createdIso = UTC ISO string

Response data:
```json
{
  "sale": { ...PosSale },
  "receipt": { ...PosTicketReceipt },
  "products": [ ...PosProduct[] actualizados opcional ]
}
```

Si no envías products[], el frontend vuelve a llamar GET /products.

---

### 6. Listar ventas
GET /api/v1/sales

Query opcionales:
- from (ISO date string)
- to (ISO date string)

Response data: PosSale[] ordenadas por dateIso desc

---

### 7. Ventas del día
GET /api/v1/sales/today

Ventas desde medianoche (timezone Mexico City) hasta ahora.
Response data: PosSale[]

---

## Autenticación

- Exigir Authorization: Bearer en todos los endpoints excepto health/swagger
- Validar JWT contra el mismo issuer/secret que Security API Tanosi, O delegar introspección al Security API
- Rechazar 401/403 con envelope Tanosi si aplica

---

## Base de datos sugerida

Tablas mínimas:
- Products (Id, TenantId, BranchId, Sku, Name, Category, Price, Stock, CreatedAt, UpdatedAt)
- Sales (Id, TenantId, BranchId, TicketId, Subtotal, Tax, Total, PaymentMethod, IvaRegimen, IvaRate, MemberId, MemberName, DateIso, LinesSummary)
- SaleLines (SaleId, ProductId, ProductName, Quantity, UnitPrice, LineTotal)

Índices: (TenantId, BranchId), ProductId en SaleLines

---

## Swagger

Publicar Swagger UI en /swagger/index.html con todos los endpoints, schemas y ejemplo de Authorization Bearer.

---

## Despliegue Neubox

1. Subdominio: elitegym247.pos.tanosi.com.mx → carpeta del API publicado (IIS)
2. SSL Let's Encrypt
3. Verificar: GET https://elitegym247.pos.tanosi.com.mx/api/v1/products → 200 (con token) o 401 (sin token)
4. El frontend en elitegym247.tanosi.com.mx ya tiene proxy PHP:
   /pos-api/* → https://elitegym247.pos.tanosi.com.mx/*
   No requiere CORS en el API si todo pasa por el proxy.

---

## Seed data inicial (opcional)

Insertar productos demo:
| id | name | category | price | stock |
|----|------|----------|-------|-------|
| SUP-001 | ISO WHEY | SUPPLEMENTS | 899 | 30 |
| SUP-002 | CREATINA | SUPPLEMENTS | 449 | 50 |
| GEAR-001 | PLAYERA ELITE | GEAR | 399 | 20 |
| ACC-001 | TOALLA | ACCESSORIES | 199 | 40 |

---

## Criterios de aceptación

- [ ] Swagger accesible en producción
- [ ] CRUD productos funcional con filtro search/category
- [ ] Checkout descuenta stock y persiste venta
- [ ] GET /sales/today usado por pantalla Reportes del frontend
- [ ] Respuestas compatibles con envelope Tanosi
- [ ] Headers X-Tenant-Id y X-Branch-Id respetados
- [ ] Desplegado en elitegym247.pos.tanosi.com.mx con SSL

---

## Integración con frontend (cuando esté desplegado)

En el repo Gymmanagementplatform, cambiar:

.env.production:
  VITE_POS_DATA_SOURCE=rest
  VITE_POS_API_BASE_URL=/pos-api

src/app/config/posHost.ts:
  dataSource: "rest"

Rebuild y subir dist/. No requiere cambios en RestPosRepository si el contrato se respeta.
```

---

## Fin del PROMPT

---

## Checklist post-despliegue (este repo)

Cuando confirmes que el API está arriba:

1. Probar: `GET https://elitegym247.tanosi.com.mx/pos-api/api/v1/products` (con sesión)
2. Cambiar `VITE_POS_DATA_SOURCE=rest` en `.env.production`
3. Cambiar `dataSource: "rest"` en `src/app/config/posHost.ts`
4. `npm run build` y subir `dist/`
