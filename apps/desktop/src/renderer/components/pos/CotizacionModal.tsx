import { useState, useEffect } from "react";
import { X, FileText, ShoppingCart, Trash2 } from "lucide-react";

interface Cotizacion {
  id: number;
  folio: string;
  fecha: string;
  total: number;
  items: Array<{
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
}

interface CotizacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConvert: (items: any[]) => void;
}

export function CotizacionModal({ isOpen, onClose, onConvert }: CotizacionModalProps) {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Cotizacion | null>(null);

  useEffect(() => {
    if (isOpen) loadCotizaciones();
  }, [isOpen]);

  const loadCotizaciones = async () => {
    setLoading(true);
    try {
      const list = await window.api.cotizaciones.list();
      setCotizaciones(list);
    } catch {
      setCotizaciones([]);
    }
    setLoading(false);
  };

  const handleConvert = async (cot: Cotizacion) => {
    await window.api.cotizaciones.convert(cot.id);
    onConvert(cot.items);
    onClose();
  };

  const handleDelete = async (id: number) => {
    await window.api.cotizaciones.delete(id);
    setCotizaciones((prev) => prev.filter((c) => c.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-pos-card border border-slate-700 rounded-2xl w-[700px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-pos-text font-semibold flex items-center gap-2">
            <FileText size={20} className="text-pos-amber" />
            Cotizaciones
          </h2>
          <button onClick={onClose} className="text-pos-muted hover:text-pos-text cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-pos-muted text-sm text-center py-8">Cargando...</p>
          ) : cotizaciones.length === 0 ? (
            <p className="text-pos-muted text-sm text-center py-8">No hay cotizaciones pendientes</p>
          ) : (
            <div className="space-y-3">
              {cotizaciones.map((cot) => (
                <div
                  key={cot.id}
                  className={`border rounded-xl p-4 cursor-pointer transition-colors ${
                    selected?.id === cot.id
                      ? "border-pos-amber bg-pos-active"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                  onClick={() => setSelected(selected?.id === cot.id ? null : cot)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-pos-text font-mono text-sm font-medium">{cot.folio}</span>
                      <span className="text-pos-muted text-xs ml-3">
                        {new Date(cot.fecha).toLocaleDateString("es-MX")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-pos-text font-mono font-semibold">
                        ${cot.total.toFixed(2)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleConvert(cot); }}
                        className="p-1.5 rounded-lg bg-pos-green/20 text-pos-green hover:bg-pos-green/30 cursor-pointer"
                        title="Convertir a venta"
                      >
                        <ShoppingCart size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(cot.id); }}
                        className="p-1.5 rounded-lg bg-pos-red/20 text-pos-red hover:bg-pos-red/30 cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {selected?.id === cot.id && cot.items.length > 0 && (
                    <div className="mt-3 border-t border-slate-700 pt-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-pos-muted text-xs">
                            <th className="text-left pb-1">Producto</th>
                            <th className="text-right pb-1">Cant</th>
                            <th className="text-right pb-1">Precio</th>
                            <th className="text-right pb-1">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cot.items.map((item, i) => (
                            <tr key={i} className="text-pos-text">
                              <td className="py-0.5">{item.nombre}</td>
                              <td className="text-right">{item.cantidad}</td>
                              <td className="text-right font-mono">${item.precioUnitario.toFixed(2)}</td>
                              <td className="text-right font-mono">${item.subtotal.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
