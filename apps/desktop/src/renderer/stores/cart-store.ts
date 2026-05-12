import { create } from "zustand";

export interface CartItem {
  productoId: number;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  descuento: number;
  tasaIva: number;
  subtotal: number;
}

function calcSubtotal(precio: number, cantidad: number, descuento: number): number {
  return (precio * cantidad) - descuento;
}

interface CartState {
  items: CartItem[];
  descuentoGlobal: number;
  addItem: (product: { id: number; nombre: string; precioVenta: number; tasaIva: number }) => void;
  removeItem: (productoId: number) => void;
  updateQuantity: (productoId: number, cantidad: number) => void;
  updateItemDiscount: (productoId: number, descuento: number) => void;
  setGlobalDiscount: (descuento: number) => void;
  clear: () => void;
  getSubtotal: () => number;
  getDiscountTotal: () => number;
  getIva: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  descuentoGlobal: 0,

  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.productoId === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productoId === product.id
              ? { ...i, cantidad: i.cantidad + 1, subtotal: calcSubtotal(i.precioUnitario, i.cantidad + 1, i.descuento) }
              : i
          ),
        };
      }
      return {
        items: [...state.items, {
          productoId: product.id,
          nombre: product.nombre,
          precioUnitario: product.precioVenta,
          cantidad: 1,
          descuento: 0,
          tasaIva: product.tasaIva,
          subtotal: product.precioVenta,
        }],
      };
    });
  },

  removeItem: (productoId) => set((state) => ({ items: state.items.filter((i) => i.productoId !== productoId) })),

  updateQuantity: (productoId, cantidad) => {
    if (cantidad <= 0) { get().removeItem(productoId); return; }
    set((state) => ({
      items: state.items.map((i) =>
        i.productoId === productoId
          ? { ...i, cantidad, subtotal: calcSubtotal(i.precioUnitario, cantidad, i.descuento) }
          : i
      ),
    }));
  },

  updateItemDiscount: (productoId, descuento) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.productoId === productoId
          ? { ...i, descuento, subtotal: calcSubtotal(i.precioUnitario, i.cantidad, descuento) }
          : i
      ),
    }));
  },

  setGlobalDiscount: (descuento) => set({ descuentoGlobal: descuento }),
  clear: () => set({ items: [], descuentoGlobal: 0 }),

  getSubtotal: () => get().items.reduce((sum, i) => sum + i.subtotal, 0),
  getDiscountTotal: () => get().items.reduce((sum, i) => sum + i.descuento, 0) + get().descuentoGlobal,
  getIva: () => get().items.reduce((sum, i) => sum + i.subtotal * i.tasaIva, 0),
  getTotal: () => get().getSubtotal() + get().getIva() - get().descuentoGlobal,
}));
