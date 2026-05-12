import { create } from "zustand";

interface AppState {
  sucursalId: number;
  sucursalNombre: string;
  terminalId: number;
  terminalNombre: string;
  setSucursal: (id: number, nombre: string) => void;
  setTerminal: (id: number, nombre: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sucursalId: 1,
  sucursalNombre: "Sucursal Principal",
  terminalId: 1,
  terminalNombre: "Caja 1",
  setSucursal: (id, nombre) => set({ sucursalId: id, sucursalNombre: nombre }),
  setTerminal: (id, nombre) => set({ terminalId: id, terminalNombre: nombre }),
}));
