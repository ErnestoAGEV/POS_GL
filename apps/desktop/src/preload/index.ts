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
