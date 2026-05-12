# POSGL - Sistema Punto de Venta

## Resumen

Sistema punto de venta (POS) de escritorio para el mercado mexicano, similar a Compucaja. Licencia unica, instalacion local con servidor central para sincronizacion. Soporta desde una caja hasta cadenas multi-sucursal. Incluye facturacion electronica CFDI 4.0 timbrada por el SAT.

## Modelo de Negocio

- Licencia unica (pago unico por terminal)
- Instalacion local en Windows
- Servidor central para sincronizacion entre terminales/sucursales
- Web companion para reportes y dashboard desde cualquier dispositivo

## Arquitectura General

```
SERVIDOR CENTRAL
  Node.js + Fastify + PostgreSQL
  - REST API (sync batch: ventas, cortes, inventario)
  - WebSockets via Socket.io (sync tiempo real: precios, productos)
  - Web App Next.js (dashboard, reportes, analytics)

RED LOCAL / INTERNET

POS TERMINAL (Electron)
  React + TypeScript + Tailwind CSS
  SQLite local (opera offline)
  Cola de operaciones pendientes (sync al reconectar)
```

### Flujo de sincronizacion

- Cada terminal trabaja con SQLite local - si se cae internet, la caja sigue operando
- WebSockets para sync en tiempo real: cuando alguien actualiza un precio en el servidor, todas las terminales lo reciben al instante
- REST API para sync batch: ventas, cortes, inventario se envian al servidor cuando hay conexion
- Cola de operaciones offline: las operaciones se encolan y sincronizan automaticamente al reconectarse
- Cada registro lleva campos `sync_id` (UUID), `updated_at` y `sync_status` (pendiente/sincronizado)
- Resolucion de conflictos: ultima escritura gana, excepto ventas que nunca se sobreescriben

## Stack Tecnologico

### Desktop (POS)

| Componente | Tecnologia |
|-----------|-----------|
| Shell | Electron 33+ |
| UI Framework | React 19 + TypeScript |
| Estilos | Tailwind CSS 4 |
| Estado | Zustand |
| BD Local | better-sqlite3 |
| ORM Local | Drizzle ORM |
| Impresora | node-thermal-printer (ESC/POS) |
| Codigo barras | quagga2 (camara) + input directo lector USB |
| Sync tiempo real | Socket.io client |

### Servidor Central

| Componente | Tecnologia |
|-----------|-----------|
| Runtime | Node.js 22 LTS |
| Framework | Fastify |
| BD | PostgreSQL 17 |
| ORM | Drizzle ORM (esquemas compartidos con desktop) |
| WebSockets | Socket.io |
| Autenticacion | JWT + bcrypt |
| Facturacion | Finkok API (CFDI 4.0) |
| Generacion PDF | @react-pdf/renderer |

### Web Companion (Dashboard)

| Componente | Tecnologia |
|-----------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Graficas | Recharts |
| Tablas | TanStack Table |
| Exportacion | SheetJS (Excel) + @react-pdf/renderer (PDF) |

### Monorepo

| Componente | Tecnologia |
|-----------|-----------|
| Gestor | pnpm workspaces |
| Monorepo tool | Turborepo |
| Paquete compartido | @posgl/shared (tipos, esquemas, validaciones, catalogos SAT) |

### Estructura del monorepo

```
posgl/
  apps/
    desktop/          <- Electron + React (POS)
    server/           <- Fastify API + WebSockets
    web/              <- Next.js Dashboard
  packages/
    shared/           <- Tipos, esquemas Drizzle, utils, catalogos SAT
  turbo.json
  pnpm-workspace.yaml
  package.json
```

## Modulos

### 1. Punto de Venta (Caja)

- Busqueda rapida de productos (codigo de barras, nombre, SKU)
- Carrito de venta con edicion de cantidades
- Cobro mixto (ej: parte efectivo, parte tarjeta)
- Ventas en espera (pausar y retomar)
- Cotizaciones imprimibles
- Descuentos por producto, por ticket y por cliente
- Apartados con pagos parciales
- Devoluciones y notas de credito
- Impresion de ticket automatica
- Reimpresion de tickets (ultimo ticket o por folio/fecha)

### 2. Inventario

- Catalogo de productos con categorias/subcategorias
- Entradas de mercancia (compras)
- Salidas (mermas, autoconsumo)
- Traspasos entre sucursales
- Ajustes de inventario
- Alertas de stock minimo
- Codigos de barras (lectura y generacion)

### 3. Clientes

- Directorio de clientes
- Datos fiscales para facturacion (RFC, razon social, regimen fiscal, uso CFDI, domicilio fiscal)
- Historial de compras
- Saldo de credito (fiado) y estado de cuenta
- Tarjetas de regalo (saldo, movimientos)

### 4. Facturacion (CFDI 4.0)

- Facturar ventas individuales o en lote
- Factura global automatica (RFC generico XAXX010101000) al hacer corte final
- Notas de credito
- Complementos de pago
- Cancelacion ante el SAT
- Descarga de XML y PDF
- Catalogos del SAT actualizados (formas de pago, uso CFDI, regimen fiscal)

### 5. Cortes de Caja

- Corte parcial (durante el turno)
- Corte final (cierre de turno)
- Conteo de efectivo (denominaciones)
- Entradas/salidas de efectivo (cambio, retiros)
- Diferencia calculada vs declarada

### 6. Reportes y Analytics

- Ventas por periodo, vendedor, categoria, sucursal
- Productos mas/menos vendidos
- Utilidades por producto
- Comparativos entre periodos
- Dashboard en tiempo real
- Graficas de tendencias
- Prediccion de demanda y sugerencias de reorden
- Deteccion de productos de lento movimiento
- Exportacion a Excel y PDF

### 7. Administracion

- Usuarios: admin y cajero
- Configuracion de sucursales y terminales
- Datos fiscales del negocio (emisor)
- Configuracion de impresora y hardware
- Respaldos de base de datos
- Catalogo de formas de pago y vales de despensa

### 8. Proveedores

- Directorio de proveedores
- Historial de compras por proveedor
- Comparar precios de compra

### 9. Promociones

- Promociones programables: 2x1, 3x$100, porcentaje por categoria
- Fecha de inicio y fin (vigencia)
- Aplicacion automatica en el punto de venta

### 10. Bitacora de Actividad

- Log de acciones: ventas, cancelaciones, cambios de precio, devoluciones
- Registro de usuario, fecha/hora y descripcion
- Consulta con filtros por usuario, tipo de accion y periodo

## Modelo de Datos

### Entidades principales

- **Sucursal**: id, nombre, direccion, telefono, datos fiscales
- **Terminal**: id, sucursal_id, nombre, estado
- **Usuario**: id, nombre, username, password_hash, rol (admin/cajero), sucursal_id
- **Producto**: id, nombre, sku, codigo_barras, precio_venta, costo, categoria_id, stock_minimo, activo
- **StockSucursal**: producto_id, sucursal_id, cantidad (stock por sucursal)
- **Categoria**: id, nombre, categoria_padre_id (subcategorias)
- **Cliente**: id, nombre, telefono, email, rfc, razon_social, regimen_fiscal, uso_cfdi, domicilio_fiscal, limite_credito, saldo_credito
- **Proveedor**: id, nombre, contacto, telefono, email, rfc
- **Venta**: id, folio, terminal_id, usuario_id, cliente_id, subtotal, descuento, iva, total, tipo (normal/apartado/cotizacion), estado, fecha
- **VentaDetalle**: id, venta_id, producto_id, cantidad, precio_unitario, descuento, subtotal
- **Pago**: id, venta_id, forma_pago (efectivo/tarjeta/transferencia/credito/vale/tarjeta_regalo), monto, referencia
- **Factura**: id, venta_ids, cliente_id, uuid_fiscal, xml, pdf, estado (timbrada/cancelada), tipo (individual/global/nota_credito/complemento), fecha
- **CorteCaja**: id, terminal_id, usuario_id, tipo (parcial/final), efectivo_sistema, efectivo_declarado, diferencia, fecha_apertura, fecha_cierre
- **MovimientoCaja**: id, corte_id, tipo (entrada/salida), monto, concepto
- **Compra**: id, proveedor_id, sucursal_id, total, fecha
- **CompraDetalle**: id, compra_id, producto_id, cantidad, costo_unitario
- **Traspaso**: id, sucursal_origen_id, sucursal_destino_id, usuario_id, estado, fecha
- **TraspasoDetalle**: id, traspaso_id, producto_id, cantidad
- **Promocion**: id, nombre, tipo (2x1/3xN/porcentaje/monto_fijo), valor, aplica_a (producto_id/categoria_id), fecha_inicio, fecha_fin, activa
- **TarjetaRegalo**: id, codigo, saldo, cliente_id, activa
- **TarjetaRegaloMovimiento**: id, tarjeta_id, tipo (carga/consumo), monto, venta_id, fecha
- **Apartado**: id, venta_id, enganche, saldo_pendiente, estado (activo/liquidado/cancelado)
- **ApartadoAbono**: id, apartado_id, monto, forma_pago, fecha
- **Bitacora**: id, usuario_id, accion, entidad, entidad_id, descripcion, fecha

### Campos de sincronizacion (en todas las tablas)

- sync_id: UUID unico global
- updated_at: timestamp de ultima modificacion
- sync_status: pendiente | sincronizado

## Flujos Principales

### Flujo de Venta

1. Cajero abre turno con monto inicial de efectivo
2. Escanea/busca producto -> se agrega al carrito
3. Se aplican promociones automaticas si existen
4. Cajero puede modificar cantidad, aplicar descuento manual
5. Cobro: selecciona forma(s) de pago (mixto permitido)
   - Si es credito: valida saldo disponible del cliente
   - Si incluye tarjeta de regalo: descuenta saldo
   - Si incluye vale de despensa: registra referencia
   - Calcula cambio si hay efectivo
6. Genera venta en SQLite con sync_status=pendiente
7. Imprime ticket automaticamente
8. Si el cliente quiere factura -> flujo de facturacion
9. Venta se encola para sincronizacion al servidor

### Flujo de Facturacion

1. Cajero busca/registra cliente con datos fiscales
2. Selecciona venta(s) a facturar
3. Sistema pre-llena CFDI (emisor, receptor, conceptos, forma/metodo de pago)
4. Envia a Finkok API para timbrado
5. Recibe XML timbrado + UUID fiscal
6. Genera PDF de la factura
7. Almacena XML y PDF localmente
8. Sincroniza al servidor central

### Factura Global Automatica

- Al hacer corte final, el sistema genera automaticamente la factura global
- Incluye todas las ventas del periodo que NO fueron facturadas individualmente
- RFC generico: XAXX010101000
- Obligatorio por normativa SAT

### Flujo de Sincronizacion

- Terminal con conexion:
  - WebSocket conectado al servidor
  - Cambios de precios/productos del servidor -> push inmediato a todas las terminales
  - Ventas/cortes de terminal -> se envian al servidor en tiempo real
- Terminal sin conexion:
  - Todas las operaciones se guardan en SQLite
  - Cola de sync acumula operaciones pendientes
  - Al reconectar: recibe actualizaciones, envia pendientes en orden cronologico
  - Resolucion de conflictos: ultima escritura gana, excepto ventas (nunca se sobreescriben)

### Flujo de Corte de Caja

1. Cajero solicita corte (parcial o final)
2. Sistema calcula total vendido por forma de pago, entradas/salidas de efectivo, efectivo esperado
3. Cajero cuenta efectivo por denominaciones
4. Sistema muestra diferencia (sobrante/faltante)
5. Se genera reporte del corte e imprime resumen
6. Si es corte final: cierra turno y genera factura global automatica

### Flujo de Apartado

1. Se genera venta tipo "apartado"
2. Cliente hace pago parcial (enganche)
3. Productos se reservan (bajan del inventario disponible)
4. Cliente regresa a hacer abonos
5. Al liquidar: se entrega mercancia y se genera ticket final
6. Si cancela: se devuelve inventario, se aplica politica de devolucion

## Diseno de UI/UX

### Paleta de Colores

| Rol | Color | Uso |
|-----|-------|-----|
| Fondo principal | #020617 (slate-950) | Background de toda la app |
| Fondo tarjetas | #0F172A (slate-900) | Paneles, cards, sidebar |
| Fondo activo | #1E293B (slate-800) | Elemento seleccionado, hover |
| Texto principal | #F8FAFC (slate-50) | Titulos, datos importantes |
| Texto secundario | #94A3B8 (slate-400) | Labels, descripciones |
| Acento primario | #22C55E (green-500) | Cobrar, confirmar, totales positivos |
| Acento peligro | #EF4444 (red-500) | Cancelar, eliminar, faltantes |
| Acento info | #3B82F6 (blue-500) | Links, acciones secundarias |
| Acento warning | #F59E0B (amber-500) | Alertas de stock, apartados |

### Tipografia

| Elemento | Fuente | Peso | Tamano |
|----------|--------|------|--------|
| Headings | Rubik | 600-700 | 20-28px |
| Body/UI | Nunito Sans | 400-600 | 14-16px |
| Montos/Precios | Rubik | 700 | 24-48px |
| Codigo barras/SKU | Nunito Sans | 400 | 12px |

### Layout del POS (pantalla principal de caja)

```
NAVBAR: Logo | Sucursal | Terminal | Cajero | Reloj
SIDEBAR (nav): Caja, Inventario, Clientes, Facturacion, Cortes, Reportes, Config
AREA CENTRAL:
  - Barra de busqueda de productos (codigo/nombre)
  - Lista de productos en carrito (producto, cantidad, precio, subtotal)
PANEL DERECHO (resumen):
  - Subtotal, Descuento, IVA, TOTAL (fuente grande verde)
  - Boton COBRAR prominente (F12)
BARRA INFERIOR: Teclas rapidas F1-F12
```

### Principios de UX

- Teclas rapidas (F1-F12): el cajero no debe tocar el mouse para operaciones comunes
- Total siempre visible: fuente grande (48px), color verde
- Feedback inmediato: sonido sutil al escanear, animacion rapida al agregar al carrito
- Contraste alto: dark mode OLED con texto claro
- Iconos SVG: Lucide icons, nunca emojis
- Transiciones rapidas: 150ms maximo
- cursor-pointer en todos los elementos clickeables
- Focus states visibles para navegacion por teclado

### Graficas del Dashboard

| Dato | Tipo de grafica |
|------|-----------------|
| Ventas por periodo | Line Chart |
| Productos mas vendidos | Bar Chart horizontal |
| Ventas por categoria | Bar Chart agrupado |
| Comparativo sucursales | Radar Chart |
| Ventas en tiempo real | Streaming Area Chart |
| Prediccion de demanda | Line con banda de confianza |

## Metodos de Pago Soportados

- Efectivo (con calculo de cambio)
- Tarjeta de credito/debito (registro de referencia)
- Transferencia bancaria / CoDi
- Credito a clientes (fiado/cuenta por cobrar)
- Vales de despensa
- Tarjetas de regalo (saldo interno)
- Cobro mixto (combinacion de cualquiera de los anteriores)

## Hardware Soportado

- Impresora termica de tickets (ESC/POS: Epson, Star, Bixolon)
- Lector de codigo de barras USB (input directo como teclado)

## Normativas Mexico

- CFDI 4.0 (version vigente)
- PAC: Finkok (inicial), arquitectura preparada para multi-PAC
- Factura global obligatoria (RFC XAXX010101000)
- Catalogos SAT: formas de pago, uso CFDI, regimen fiscal, clave producto/servicio, unidad de medida
- Complementos de pago
- Notas de credito
- Cancelacion con motivo ante el SAT
