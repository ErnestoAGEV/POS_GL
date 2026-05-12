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
  inventory: {
    products: (query?: string) =>
      ipcRenderer.invoke("inventory:products", query),
    stockAlerts: () => ipcRenderer.invoke("inventory:stock-alerts"),
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
