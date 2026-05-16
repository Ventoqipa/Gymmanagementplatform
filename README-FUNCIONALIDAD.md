# Elite Gym 24/7 — Alcance funcional (MVP / demo)

Documento orientado a negocio: resume lo que el **demo** muestra hoy y cómo se alinea con el MVP descrito en la hoja de alcance (núcleo operativo + POS).

## Visión del producto

Plataforma de **gestión de gimnasio** que combina:

1. **Núcleo operativo:** socios, membresías, pagos, control de acceso biométrico, registro de visitas y reportes básicos.
2. **Punto de venta (POS):** venta de productos (suplementos, indumentaria, accesorios), inventario simplificado, métodos de pago y emisión de tickets.

Las integraciones de **FaceID** y **torniquetes** están **planteadas como APIs de terceros**; en el demo se usan respuestas simuladas con la misma forma que tendrán las llamadas reales.

## Módulos y pantallas

| Área MVP | Funcionalidad | Pantalla / flujo en el demo |
|----------|----------------|-----------------------------|
| Acceso FaceID + torniquete | Verificación biométrica, comando de apertura/cierre, correlación por IDs de proveedor | **Access Control** — simulador “Simular lectura FaceID”, estado por terminal, log con `fv_*` y `ts_*` |
| Registro de visitas | Entradas concedidas/denegadas, trazabilidad por terminal | Mismo log en **Access Control** y resumen en **Reports → Core operativo** |
| Gestión de clientes | Alta/edición/consulta e historial relevante | **Members** — listado, filtros, detalle expandible; **Registrar pago**; vínculo a POS |
| Membresías | Planes (tier), vigencias, estados | **Members** — tier, renovación, estado `ACTIVE` / `EXPIRED` / `PENDING` |
| Pagos (membresía) | Registro de cobros | Modal **Registrar pago** + historial + datos en **Reports** |
| Reportes básicos — ingresos | Ingresos por membresías | **Reports → Core operativo** |
| Reportes — clientes activos | Indicador agregado | **Reports → Core operativo** (referencia alineada al dashboard) |
| Reportes — accesos | Eventos del día / historial | **Reports → Core operativo** + **Access Control** |
| POS — venta | Catálogo, carrito, impuestos, checkout | **POS Terminal** |
| POS — inventario | Stock por SKU | Catálogo + descuento de stock al cerrar venta + **Add Product** |
| POS — métodos de pago | Efectivo, tarjeta, QR | Selector de método en **POS** |
| POS — ticket | Comprobante de venta | Modal de ticket tras **Complete Transaction** |
| Reportes POS | Ventas del día, top productos | **Reports → Punto de venta** (ventas del día desde almacén demo; ranking en serie mock hasta backend) |
| Dashboard | Vista operativa rápida | **Dashboard** — métricas y actividad (datos estáticos de demo) |

## Flujo sugerido para la demo con el cliente

1. **Members:** expandir un socio → **Registrar pago** → ver historial.
2. Desde el mismo detalle → **Vender en POS** (lleva al POS con el cliente preseleccionado).
3. **POS:** agregar productos → método de pago → **Complete Transaction** → revisar **ticket** y stock actualizado.
4. **Access Control:** elegir terminal y escenario → **Simular lectura FaceID** → ver entrada en el log y estados de torniquete.
5. **Reports:** pestaña **Core operativo** (membresías y accesos) y **Punto de venta** (ventas del día).

## Qué queda explícitamente fuera del demo técnico actual

- Backend persistente, multi-sede, permisos finos y auditoría legal.
- Integraciones reales con proveedor FaceID / torniquete (solo contratos y mocks en código).
- Impuestos/facturación fiscal definitiva (el ticket indica que es demo).
- App móvil nativa o kiosco offline.

Para el detalle de stack, carpetas y mocks técnicos, ver **README-TECNICO.md**.
