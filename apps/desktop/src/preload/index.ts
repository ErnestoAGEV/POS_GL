import { contextBridge, ipcRenderer } from "electron";

const api = {
  auth: {
    login: (credentials: {
      username: string;
      password: string;
      serverUrl: string;
    }) => ipcRenderer.invoke("auth:login", credentials),
    logout: () => ipcRenderer.invoke("auth:logout"),
  },
  products: {
    search: (query: string) => ipcRenderer.invoke("products:search", query),
    getByBarcode: (code: string) => ipcRenderer.invoke("products:barcode", code),
  },
  categories: {
    list: () => ipcRenderer.invoke("categories:list"),
  },
  ventas: {
    create: (sale: {
      terminalId: number;
      usuarioId: number;
      clienteId?: number;
      subtotal: number;
      descuento: number;
      iva: number;
      total: number;
      items: Array<{
        productoId: number;
        nombre: string;
        cantidad: number;
        precioUnitario: number;
        descuento: number;
        subtotal: number;
      }>;
      pagos: Array<{
        formaPago: string;
        monto: number;
        referencia?: string;
      }>;
    }) => ipcRenderer.invoke("ventas:create", sale),
  },
  clients: {
    list: (query?: string) => ipcRenderer.invoke("clients:list", query),
    get: (id: number) => ipcRenderer.invoke("clients:get", id),
    create: (data: {
      nombre: string;
      telefono?: string;
      email?: string;
      rfc?: string;
      razonSocial?: string;
      regimenFiscal?: string;
      usoCfdi?: string;
      domicilioFiscal?: string;
      limiteCredito?: number;
    }) => ipcRenderer.invoke("clients:create", data),
    update: (id: number, data: {
      nombre?: string;
      telefono?: string;
      email?: string;
      rfc?: string;
      razonSocial?: string;
      regimenFiscal?: string;
      usoCfdi?: string;
      domicilioFiscal?: string;
      limiteCredito?: number;
      activo?: boolean;
    }) => ipcRenderer.invoke("clients:update", id, data),
    purchases: (clienteId: number) => ipcRenderer.invoke("clients:purchases", clienteId),
  },
  cortes: {
    abrir: (data: { terminalId: number; efectivoInicial: number }) =>
      ipcRenderer.invoke("cortes:abrir", data),
    activo: (terminalId: number) =>
      ipcRenderer.invoke("cortes:activo", terminalId),
    cerrar: (id: number, data: {
      tipo: string;
      efectivoDeclarado: number;
      efectivoSistema: number;
      totalVentas: number;
      totalEfectivo: number;
      totalTarjeta: number;
      totalTransferencia: number;
      totalOtros: number;
    }) => ipcRenderer.invoke("cortes:cerrar", id, data),
    movimiento: (corteId: number, data: {
      tipo: string;
      monto: number;
      concepto: string;
    }) => ipcRenderer.invoke("cortes:movimiento", corteId, data),
    list: (terminalId: number) =>
      ipcRenderer.invoke("cortes:list", terminalId),
  },
  facturas: {
    create: (data: {
      ventaIds: number[];
      clienteId: number;
      tipo: string;
      total: number;
    }) => ipcRenderer.invoke("facturas:create", data),
    list: () => ipcRenderer.invoke("facturas:list"),
    cancel: (id: number) => ipcRenderer.invoke("facturas:cancel", id),
    recentSales: () => ipcRenderer.invoke("facturas:recent-sales"),
  },
  config: {
    appInfo: () => ipcRenderer.invoke("config:app-info"),
    dbStats: () => ipcRenderer.invoke("config:db-stats"),
  },
  reports: {
    salesSummary: (dateFrom: string, dateTo: string) =>
      ipcRenderer.invoke("reports:sales-summary", dateFrom, dateTo),
    topProducts: (dateFrom: string, dateTo: string, limit?: number) =>
      ipcRenderer.invoke("reports:top-products", dateFrom, dateTo, limit),
    byPaymentMethod: (dateFrom: string, dateTo: string) =>
      ipcRenderer.invoke("reports:by-payment-method", dateFrom, dateTo),
  },
  inventory: {
    products: (query?: string) =>
      ipcRenderer.invoke("inventory:products", query),
    stockAlerts: () => ipcRenderer.invoke("inventory:stock-alerts"),
  },
  promos: {
    list: () => ipcRenderer.invoke("promos:list"),
    active: () => ipcRenderer.invoke("promos:active"),
    create: (data: {
      nombre: string;
      tipo: string;
      valor: number;
      precioObjetivo?: number;
      productoId?: number;
      categoriaId?: number;
      fechaInicio: string;
      fechaFin: string;
    }) => ipcRenderer.invoke("promos:create", data),
    toggle: (id: number, activa: boolean) =>
      ipcRenderer.invoke("promos:toggle", id, activa),
  },
  bitacora: {
    log: (data: {
      accion: string;
      entidad: string;
      entidadId?: number;
      descripcion?: string;
    }) => ipcRenderer.invoke("bitacora:log", data),
    list: (filters?: {
      accion?: string;
      entidad?: string;
      desde?: string;
      hasta?: string;
      limit?: number;
    }) => ipcRenderer.invoke("bitacora:list", filters),
  },
  ticket: {
    print: (data: any) => ipcRenderer.invoke("ticket:print", data),
    preview: (data: any) => ipcRenderer.invoke("ticket:preview", data),
    config: (config: { type: string; interface: string; width: number } | null) =>
      ipcRenderer.invoke("ticket:config", config),
    getConfig: () => ipcRenderer.invoke("ticket:get-config"),
  },
  ventasEspera: {
    hold: (data: {
      nombre: string;
      terminalId: number;
      usuarioId: number;
      clienteId?: number;
      items: any[];
    }) => ipcRenderer.invoke("ventas-espera:hold", data),
    list: (terminalId: number) => ipcRenderer.invoke("ventas-espera:list", terminalId),
    recall: (id: number) => ipcRenderer.invoke("ventas-espera:recall", id),
    delete: (id: number) => ipcRenderer.invoke("ventas-espera:delete", id),
  },
  ventasDetail: {
    get: (ventaId: number) => ipcRenderer.invoke("ventas:get-detail", ventaId),
    searchByFolio: (folio: string) => ipcRenderer.invoke("ventas:search-by-folio", folio),
    recent: (limit?: number) => ipcRenderer.invoke("ventas:recent", limit),
  },
  apartados: {
    create: (data: {
      ventaId: number;
      clienteId?: number;
      enganche: number;
      total: number;
      fechaLimite?: string;
    }) => ipcRenderer.invoke("apartados:create", data),
    list: () => ipcRenderer.invoke("apartados:list"),
    get: (id: number) => ipcRenderer.invoke("apartados:get", id),
    abono: (id: number, data: { monto: number; formaPago: string }) =>
      ipcRenderer.invoke("apartados:abono", id, data),
    cancelar: (id: number) => ipcRenderer.invoke("apartados:cancelar", id),
  },
  tarjetas: {
    create: (data: { codigo: string; saldo: number; clienteId?: number }) =>
      ipcRenderer.invoke("tarjetas:create", data),
    list: () => ipcRenderer.invoke("tarjetas:list"),
    balance: (codigo: string) => ipcRenderer.invoke("tarjetas:balance", codigo),
    cargar: (id: number, monto: number) =>
      ipcRenderer.invoke("tarjetas:cargar", id, monto),
    consumir: (id: number, monto: number, ventaId?: number) =>
      ipcRenderer.invoke("tarjetas:consumir", id, monto, ventaId),
    movimientos: (id: number) => ipcRenderer.invoke("tarjetas:movimientos", id),
  },
  cotizaciones: {
    create: (data: {
      terminalId: number;
      usuarioId: number;
      clienteId?: number;
      subtotal: number;
      descuento: number;
      iva: number;
      total: number;
      items: Array<{
        productoId: number;
        nombre: string;
        cantidad: number;
        precioUnitario: number;
        descuento: number;
        subtotal: number;
      }>;
    }) => ipcRenderer.invoke("cotizaciones:create", data),
    list: () => ipcRenderer.invoke("cotizaciones:list"),
    convert: (id: number) => ipcRenderer.invoke("cotizaciones:convert", id),
    delete: (id: number) => ipcRenderer.invoke("cotizaciones:delete", id),
  },
  devoluciones: {
    create: (data: {
      ventaId: number;
      usuarioId: number;
      motivo: string;
      items: any[];
      total: number;
    }) => ipcRenderer.invoke("devoluciones:create", data),
    list: () => ipcRenderer.invoke("devoluciones:list"),
  },
  sync: {
    status: () => ipcRenderer.invoke("sync:status"),
    flush: () => ipcRenderer.invoke("sync:flush"),
    onStatus: (callback: (status: string) => void) => {
      const handler = (_event: any, status: string) => callback(status);
      ipcRenderer.on("sync:status", handler);
      return () => ipcRenderer.removeListener("sync:status", handler);
    },
    onProductUpdated: (callback: (product: any) => void) => {
      const handler = (_event: any, product: any) => callback(product);
      ipcRenderer.on("sync:product-updated", handler);
      return () => ipcRenderer.removeListener("sync:product-updated", handler);
    },
  },
};

contextBridge.exposeInMainWorld("api", api);

export type ElectronAPI = typeof api;
