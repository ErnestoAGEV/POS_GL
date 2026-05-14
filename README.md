# POSGL - Sistema Punto de Venta

Sistema de punto de venta profesional para negocios en México. Incluye aplicación de escritorio (Electron), servidor centralizado (Fastify + PostgreSQL) y panel web de administración (Next.js).

---

## Arquitectura

```
posgl/
├── apps/
│   ├── desktop/   → Aplicación de caja (Electron + React + SQLite)
│   ├── server/    → API centralizada (Fastify + PostgreSQL)
│   └── web/       → Dashboard administrativo (Next.js)
└── packages/
    └── shared/    → Tipos y utilidades compartidas
```

| Componente | Tecnología | Puerto | Descripción |
|------------|-----------|--------|-------------|
| **Desktop** | Electron + React + SQLite | — | App de caja, funciona offline |
| **Server** | Fastify + PostgreSQL | 3000 | API central, sincronización |
| **Web** | Next.js + Recharts | 3001 | Dashboard para dueños/gerentes |

---

## Requisitos Previos

| Software | Versión mínima | Descarga |
|----------|---------------|----------|
| **Node.js** | 18+ | https://nodejs.org |
| **pnpm** | 9+ | `npm install -g pnpm` |
| **PostgreSQL** | 14+ | https://www.postgresql.org/download/ |

---

## Instalación Paso a Paso

### 1. Clonar el proyecto

```bash
git clone https://github.com/ErnestoAGEV/POS_GL.git
cd POS_GL
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar la base de datos PostgreSQL

Crear la base de datos:

```sql
-- En psql o pgAdmin:
CREATE DATABASE posgl;
```

Configurar la conexión (archivo `.env` en `apps/server/`):

```bash
# apps/server/.env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/posgl
JWT_SECRET=tu-clave-secreta-cambiar-en-produccion
PORT=3000
```

> **Nota:** Si no creas el archivo `.env`, el servidor usará los valores por defecto:
> - DB: `postgresql://postgres:postgres@localhost:5432/posgl`
> - Puerto: `3000`

### 4. Crear las tablas e insertar datos de prueba

```bash
cd apps/server
pnpm db:generate    # Genera las migraciones
pnpm db:migrate     # Ejecuta las migraciones (crea tablas)
pnpm db:seed        # Inserta datos iniciales de prueba
cd ../..
```

El seed crea:
- **Sucursal:** "Sucursal Principal"
- **Terminal:** "Caja 1"
- **Usuario admin:** `admin` / `admin123`
- **Categorías:** Bebidas, Alimentos, Limpieza
- **Productos de ejemplo:** Coca-Cola, Sabritas, Fabuloso (con stock de 100 c/u)

---

## Iniciar el Sistema

### Opción A: Todo junto (desarrollo)

Desde la raíz del proyecto:

```bash
pnpm dev
```

Esto inicia los 3 servicios en paralelo con Turborepo.

### Opción B: Cada servicio por separado

**Terminal 1 — Servidor API:**
```bash
cd apps/server
pnpm dev
```
> Servidor corriendo en `http://localhost:3000`

**Terminal 2 — App de escritorio:**
```bash
cd apps/desktop
pnpm dev
```
> Se abre la ventana de Electron automáticamente

**Terminal 3 — Dashboard web (opcional):**
```bash
cd apps/web
pnpm dev
```
> Dashboard en `http://localhost:3001`

---

## Credenciales de Acceso

| App | Usuario | Contraseña | URL |
|-----|---------|-----------|-----|
| Desktop (Electron) | `admin` | `admin123` | — |
| Dashboard Web | `admin` | `admin123` | http://localhost:3001 |

> Al abrir la app de escritorio, haz clic en **"Configurar servidor"** y asegúrate de que la URL apunte a `http://localhost:3000` (o la IP de tu servidor).

---

## Guía de Uso — App de Escritorio (Cajeros)

### Pantalla de Login

1. Ingresa usuario y contraseña
2. Si el servidor no está en localhost, haz clic en "Configurar servidor" e ingresa la IP del servidor (ej: `http://192.168.1.100:3000`)

### Punto de Venta (Caja)

La pantalla principal tiene 3 áreas:

| Área | Ubicación | Función |
|------|-----------|---------|
| **Barra de búsqueda** | Superior | Escanear código de barras o buscar por nombre |
| **Carrito** | Centro | Productos agregados con cantidad, precio y subtotal |
| **Resumen** | Derecha | Totales y botón de cobro |

### Teclas Rápidas (Hotkeys)

| Tecla | Acción |
|-------|--------|
| **F1** | Enfocar búsqueda de productos |
| **F5** | Poner venta en espera |
| **F6** | Recuperar venta en espera |
| **F7** | Reimprimir último ticket |
| **F9** | Devolución |
| **F10** | Crear apartado (layaway) |
| **F11** | Crear cotización / ver cotizaciones |
| **F12** | Cobrar venta |

### Proceso de Venta

1. **Escanea o busca** productos → se agregan al carrito
2. Ajusta cantidades si es necesario
3. Presiona **F12** o el botón **Cobrar**
4. Selecciona forma(s) de pago: efectivo, tarjeta, transferencia
5. El ticket se imprime automáticamente

### Navegación (Barra Lateral)

| Sección | Descripción |
|---------|-------------|
| **Caja** | Pantalla principal de venta |
| **Inventario** | Ver productos y stock |
| **Clientes** | Directorio de clientes con crédito |
| **Facturas** | Generar y consultar facturas |
| **Cortes** | Abrir/cerrar caja, movimientos de efectivo |
| **Apartados** | Gestionar layaways (apartados con abonos) |
| **T. Regalo** | Tarjetas de regalo: crear, cargar, consultar saldo |
| **Promos** | Crear y gestionar promociones |
| **Reportes** | Resumen de ventas, top productos |
| **Bitácora** | Registro de actividad del sistema |
| **Config** | Configuración de impresora, info del sistema |

### Configurar Impresora de Tickets

1. Ve a **Config** en la barra lateral
2. En la sección **Impresora de Tickets**:
   - **Tipo:** Texto (consola), Epson ESC/POS, o Star
   - **Interfaz:** La IP de la impresora (ej: `tcp://192.168.1.50`) o puerto USB
   - **Ancho:** Columnas del ticket (48 para 58mm, 42 para 80mm)
3. Haz clic en **Guardar**
4. Usa **Imprimir Prueba** para verificar

---

## Guía de Uso — Dashboard Web (Dueños/Gerentes)

Accede desde cualquier navegador en `http://localhost:3001` (o la IP del servidor).

### Secciones del Dashboard

| Sección | Descripción |
|---------|-------------|
| **Dashboard** | KPIs del mes: ventas totales, ticket promedio, descuentos. Gráficas de ventas diarias, métodos de pago y top productos |
| **Ventas** | Historial completo de ventas con folio, estado y totales |
| **Inventario** | Catálogo de productos con costos, precios y márgenes |
| **Clientes** | Directorio completo con crédito y saldos |
| **Compras** | Órdenes de compra a proveedores. Recibir = actualiza stock |
| **Traspasos** | Transferencias de stock entre sucursales (enviar → recibir) |
| **Stock** | Stock por sucursal con valor de inventario y alertas de stock bajo |
| **Proveedores** | Directorio de proveedores (crear, editar, desactivar) |
| **Usuarios** | Gestión de cajeros y admins (crear, activar/desactivar) |
| **Sucursales** | Configurar sucursales con datos fiscales para facturación |

### Exportar a Excel

Todas las tablas tienen un botón **"Exportar Excel"** que descarga un archivo `.xlsx` con los datos visibles.

---

## Funcionalidades del Sistema

### Ventas y Cobro
- Múltiples formas de pago en una misma venta
- Cálculo automático de cambio
- Impresión automática de ticket
- Ventas en espera (hold/recall)
- Cotizaciones (quotes)

### Inventario
- Productos con código de barras, SKU, clave SAT
- Stock por sucursal
- Alertas de stock bajo
- Traspasos entre sucursales
- Órdenes de compra con recepción automática de stock

### Clientes y Crédito
- Directorio con RFC y datos fiscales
- Límite y saldo de crédito
- Historial de compras

### Apartados (Layaway)
- Enganche inicial + abonos parciales
- Barra de progreso visual
- Fecha límite configurable

### Tarjetas de Regalo
- Crear con saldo inicial
- Recargar saldo
- Usar como forma de pago
- Historial de movimientos

### Facturación
- Vincular ventas a facturas
- Datos fiscales del cliente (RFC, régimen, uso CFDI)
- Cancelación de facturas

### Cortes de Caja
- Apertura con efectivo inicial
- Movimientos (entradas/salidas de efectivo)
- Cierre con comparación sistema vs declarado
- Diferencias automáticas

### Promociones
- Descuento porcentaje o monto fijo
- Precio objetivo (ej: "3x$100")
- Por producto o categoría
- Rango de fechas

### Reportes y Dashboard
- Resumen de ventas del período
- Gráfica de ventas diarias
- Top productos más vendidos
- Desglose por método de pago
- Exportación a Excel

### Sincronización
- La app de escritorio trabaja offline con SQLite
- Se sincroniza automáticamente con el servidor cuando hay conexión
- Indicador de estado en la barra superior

---

## Compilar para Producción

### Servidor

```bash
cd apps/server
pnpm build
# Iniciar:
NODE_ENV=production DATABASE_URL="tu_url" JWT_SECRET="clave-segura" node dist/index.js
```

### Dashboard Web

```bash
cd apps/web
pnpm build
# Iniciar:
NEXT_PUBLIC_API_URL=http://tu-servidor:3000 pnpm start
```

### App de Escritorio

```bash
cd apps/desktop
pnpm build
# El resultado queda en out/ listo para empaquetar con electron-builder
```

---

## Estructura de la Base de Datos

| Tabla | Descripción |
|-------|-------------|
| `sucursales` | Sucursales/tiendas con datos fiscales |
| `terminales` | Cajas/terminales por sucursal |
| `usuarios` | Cajeros y administradores |
| `categorias` | Categorías de productos |
| `productos` | Catálogo con precios, costos, claves SAT |
| `stock_sucursal` | Stock por producto por sucursal |
| `ventas` | Transacciones de venta |
| `venta_detalles` | Productos de cada venta |
| `pagos` | Formas de pago por venta |
| `clientes` | Directorio con datos fiscales |
| `proveedores` | Proveedores |
| `compras` / `compra_detalles` | Órdenes de compra |
| `traspasos` / `traspaso_detalles` | Transferencias entre sucursales |
| `cortes_caja` | Aperturas y cierres de caja |
| `movimientos_caja` | Entradas/salidas de efectivo |
| `facturas` | Facturas emitidas |
| `apartados` / `apartado_abonos` | Layaways con pagos parciales |
| `tarjetas_regalo` / `tarjeta_regalo_movimientos` | Gift cards |
| `promociones` | Descuentos y ofertas |
| `devoluciones` | Devoluciones de productos |
| `bitacora` | Log de actividad |

---

## Soporte y Contacto

Si tienes problemas:

1. Verifica que PostgreSQL esté corriendo
2. Verifica que el servidor esté corriendo (`http://localhost:3000/health` debe responder `{"status":"ok"}`)
3. En la app de escritorio, verifica la URL del servidor en "Configurar servidor"
4. Revisa la consola del servidor para errores

**Repositorio:** https://github.com/ErnestoAGEV/POS_GL
