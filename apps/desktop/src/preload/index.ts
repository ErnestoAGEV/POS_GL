import { contextBridge, ipcRenderer } from "electron";

const api = {
  products: {
    search: (query: string) => ipcRenderer.invoke("products:search", query),
    getByBarcode: (code: string) => ipcRenderer.invoke("products:barcode", code),
  },
  categories: {
    list: () => ipcRenderer.invoke("categories:list"),
  },
};

contextBridge.exposeInMainWorld("api", api);

export type ElectronAPI = typeof api;
