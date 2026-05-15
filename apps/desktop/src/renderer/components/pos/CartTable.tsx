import { Minus, Plus, Trash2, Percent } from "lucide-react";
import { useCartStore } from "../../stores/cart-store";
import { formatCurrency } from "../../lib/format";

interface CartTableProps {
  onDiscount?: (productoId: number) => void;
}

export function CartTable({ onDiscount }: CartTableProps) {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-pos-muted">
        <div className="text-center">
          <p className="text-lg">Carrito vacío</p>
          <p className="text-sm mt-1">Escanea un producto o búscalo por nombre</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-pos-card border-b border-slate-700">
          <tr className="text-pos-muted text-xs uppercase tracking-wider">
            <th className="text-left py-3 px-4">Producto</th>
            <th className="text-center py-3 px-2 w-32">Cantidad</th>
            <th className="text-right py-3 px-4 w-28">Precio</th>
            <th className="text-right py-3 px-2 w-24">Desc.</th>
            <th className="text-right py-3 px-4 w-28">Subtotal</th>
            <th className="py-3 px-2 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.productoId}
              className="border-b border-slate-800 hover:bg-pos-active/50 transition-colors"
            >
              <td className="py-3 px-4">
                <span className="text-pos-text font-medium">{item.nombre}</span>
              </td>
              <td className="py-3 px-2">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.productoId, item.cantidad - 1)}
                    disabled={item.cantidad <= 1}
                    aria-label={`Reducir cantidad de ${item.nombre}`}
                    className="w-7 h-7 rounded-lg bg-pos-active hover:bg-slate-600 flex items-center justify-center text-pos-muted hover:text-pos-text cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-pos-text font-medium w-8 text-center tabular-nums">
                    {item.cantidad}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productoId, item.cantidad + 1)}
                    aria-label={`Aumentar cantidad de ${item.nombre}`}
                    className="w-7 h-7 rounded-lg bg-pos-active hover:bg-slate-600 flex items-center justify-center text-pos-muted hover:text-pos-text cursor-pointer transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </td>
              <td className="py-3 px-4 text-right text-pos-muted tabular-nums">
                {formatCurrency(item.precioUnitario)}
              </td>
              <td className="py-3 px-2 text-right">
                {item.descuento > 0 ? (
                  <button
                    onClick={() => onDiscount?.(item.productoId)}
                    className="text-pos-amber text-sm tabular-nums cursor-pointer hover:text-amber-300 transition-colors"
                  >
                    -{formatCurrency(item.descuento)}
                  </button>
                ) : (
                  <button
                    onClick={() => onDiscount?.(item.productoId)}
                    className="text-pos-muted hover:text-pos-amber cursor-pointer transition-colors p-1"
                    title="Aplicar descuento"
                  >
                    <Percent size={14} />
                  </button>
                )}
              </td>
              <td className="py-3 px-4 text-right text-pos-text font-medium tabular-nums">
                {formatCurrency(item.subtotal)}
              </td>
              <td className="py-3 px-2">
                <button
                  onClick={() => removeItem(item.productoId)}
                  aria-label={`Eliminar ${item.nombre} del carrito`}
                  className="text-pos-muted hover:text-pos-red cursor-pointer transition-colors p-1"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
