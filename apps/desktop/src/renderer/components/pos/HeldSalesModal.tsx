import { useState, useEffect } from "react";
import { X, Pause, Play, Trash2 } from "lucide-react";

interface HeldSale {
  id: number;
  nombre: string;
  terminal_id: number;
  usuario_id: number;
  cliente_id: number | null;
  items: Array<{
    productoId: number;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    subtotal: number;
    tasaIva: number;
  }>;
  fecha: string;
}

interface HeldSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  terminalId: number;
  onRecall: (items: HeldSale["items"]) => void;
}

export function HeldSalesModal({ isOpen, onClose, terminalId, onRecall }: HeldSalesModalProps) {
  const [sales, setSales] = useState<HeldSale[]>([]);

  useEffect(() => {
    if (isOpen) {
      window.api.ventasEspera.list(terminalId).then(setSales);
    }
  }, [isOpen, terminalId]);

  if (!isOpen) return null;

  const handleRecall = async (id: number) => {
    const sale = await window.api.ventasEspera.recall(id);
    if (sale) {
      onRecall(sale.items);
      onClose();
    }
  };

  const handleDelete = async (id: number) => {
    await window.api.ventasEspera.delete(id);
    setSales((prev) => prev.filter((s) => s.id !== id));
  };

  const getTotal = (items: HeldSale["items"]) =>
    items.reduce((sum, i) => sum + i.subtotal, 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-pos-card border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Pause size={20} className="text-pos-amber" />
            <h2 className="text-lg font-semibold text-pos-text">Ventas en Espera</h2>
            <span className="text-sm text-pos-muted">({sales.length})</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-pos-active rounded-lg transition-colors cursor-pointer">
            <X size={20} className="text-pos-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-2">
          {sales.length === 0 && (
            <div className="text-center text-pos-muted py-12 text-sm">
              No hay ventas en espera
            </div>
          )}

          {sales.map((sale) => (
            <div
              key={sale.id}
              className="bg-pos-bg border border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-pos-text truncate">{sale.nombre}</div>
                <div className="text-xs text-pos-muted">
                  {sale.items.length} productos &middot; {new Date(sale.fecha).toLocaleTimeString()}
                </div>
              </div>
              <div className="text-sm font-mono text-pos-green font-semibold">
                ${getTotal(sale.items).toFixed(2)}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleRecall(sale.id)}
                  className="p-2 rounded-lg bg-pos-green/20 text-pos-green hover:bg-pos-green/30 transition-colors cursor-pointer"
                  title="Recuperar venta"
                >
                  <Play size={16} />
                </button>
                <button
                  onClick={() => handleDelete(sale.id)}
                  className="p-2 rounded-lg bg-red-500/20 text-pos-red hover:bg-red-500/30 transition-colors cursor-pointer"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
