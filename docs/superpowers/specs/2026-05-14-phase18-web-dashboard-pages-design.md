# Phase 18: Web Dashboard Missing Pages

## Summary

Add 9 missing pages to the Next.js web dashboard. All server API endpoints already exist. Pages follow the established pattern (dark theme, Tailwind, paginated tables, Excel export, Lucide icons).

## Pages

### CRUD Pages (3)

**Categorias** `/categorias`
- Table: Nombre, Categoria Padre, Estado
- Create modal: nombre (required), categoriaPadreId (dropdown from existing categories)
- Actions: toggle activa
- Icon: FolderTree
- API: GET/POST/PUT/DELETE `/categorias`

**Terminales** `/terminales`
- Table: Nombre, Sucursal (resolved name), Estado
- Create modal: nombre (required), sucursalId (dropdown from sucursales)
- Actions: toggle activa
- Icon: Monitor
- API: GET/POST/PUT/DELETE `/terminales`

**Promociones** `/promociones`
- Table: Nombre, Tipo, Valor, Precio Objetivo, Producto/Categoria, Fecha Inicio, Fecha Fin, Estado
- Create modal: nombre, tipo (dropdown: 2x1/nxprecio/porcentaje/monto_fijo), valor, precioObjetivo (conditional), productoId, categoriaId, fechaInicio, fechaFin
- Actions: toggle activa
- Icon: Tags
- API: GET/POST/PUT/DELETE `/promociones`

### Read-Only Pages (6)

**Reportes** `/reportes`
- Date range picker (desde/hasta inputs type="date", default current month)
- 4 KPI cards: total ventas, ticket promedio, descuentos, num ventas
- Reuse existing chart components: SalesChart, TopProductsChart, PaymentChart
- Excel export of summary data
- Icon: BarChart3
- API: GET `/reportes/resumen`, `/reportes/ventas-diarias`, `/reportes/top-productos`, `/reportes/metodos-pago`

**Cortes de Caja** `/cortes`
- Table: Terminal ID, Usuario ID, Tipo (parcial/final badge), Ef. Inicial, Ef. Sistema, Ef. Declarado, Diferencia, Total Ventas, Apertura, Cierre
- Filter: terminalId (dropdown from terminales list)
- Pagination, Excel export
- Icon: Scissors
- API: GET `/cortes`

**Apartados** `/apartados`
- Table: ID, Venta ID, Cliente ID, Enganche, Saldo Pendiente, Total, Estado (badge), Fecha Limite, Fecha
- Filter: estado (dropdown: activo/liquidado/cancelado)
- Visual progress bar (enganche paid / total)
- Pagination, Excel export
- Icon: PackageCheck
- API: GET `/apartados`

**Facturas** `/facturas`
- Banner top: "Modulo de facturacion en modo simulacion"
- Table: UUID Fiscal (truncated), Cliente ID, Tipo, Total, Estado (badge timbrada/cancelada), Fecha
- Filter: estado dropdown
- Pagination, Excel export
- Icon: FileText
- API: GET `/facturas`

**Bitacora** `/bitacora`
- Table: Fecha, Usuario ID, Accion, Entidad, Entidad ID, Descripcion
- Filters: accion (text input), entidad (text input), desde/hasta (date inputs)
- No pagination (server returns max 100)
- Excel export
- Icon: ClipboardList
- API: GET `/bitacora`

**Tarjetas de Regalo** `/tarjetas-regalo`
- Table: Codigo, Saldo ($), Cliente ID, Activa (badge), Fecha Creacion
- No pagination (server returns all)
- Excel export
- Icon: CreditCard
- API: GET `/tarjetas-regalo`

## Sidebar Update

Update `DashboardShell.tsx` navItems array. New order with logical grouping:

```
Dashboard
Ventas
Inventario
Categorias        (new)
Clientes
Compras
Traspasos
Stock
Cortes            (new)
Facturas          (new)
Promociones       (new)
Apartados         (new)
T. Regalo         (new)
Reportes          (new)
Bitacora          (new)
Proveedores
Usuarios
Sucursales
Terminales        (new)
```

## API Client Update

Add to `apps/web/src/lib/api.ts`:

- `categorias` — list, create, update, delete
- `terminales` — list, create, update, delete
- `promociones` — list, create, update, delete
- `cortes` — list (with terminalId filter)
- `apartados` — list (with estado filter)
- `facturas` — list (with estado filter)
- `bitacora` — list (with accion, entidad, desde, hasta filters)
- `tarjetasRegalo` — list

## Pattern

Every page follows the same structure as existing pages:
- `"use client"` directive
- useState for data, page, loading, showForm (CRUD only)
- useEffect to load on mount / page change
- Header with icon + title + action buttons (create, export)
- Table with thead/tbody, loading/empty states
- Pagination footer (where applicable)
- Modal overlay for create forms (CRUD only)

## Files to Create/Modify

**Modify:**
- `apps/web/src/lib/api.ts` — add 8 new endpoint groups
- `apps/web/src/components/DashboardShell.tsx` — add 9 nav items + icons

**Create:**
- `apps/web/src/app/(dashboard)/categorias/page.tsx`
- `apps/web/src/app/(dashboard)/terminales/page.tsx`
- `apps/web/src/app/(dashboard)/promociones/page.tsx`
- `apps/web/src/app/(dashboard)/reportes/page.tsx`
- `apps/web/src/app/(dashboard)/cortes/page.tsx`
- `apps/web/src/app/(dashboard)/apartados/page.tsx`
- `apps/web/src/app/(dashboard)/facturas/page.tsx`
- `apps/web/src/app/(dashboard)/bitacora/page.tsx`
- `apps/web/src/app/(dashboard)/tarjetas-regalo/page.tsx`
