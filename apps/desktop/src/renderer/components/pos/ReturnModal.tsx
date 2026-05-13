import { useState } from "react";
import { X, Search, RotateCcw, AlertTriangle } from "lucide-react";

interface SaleRow {
  id: number;
  folio: string;
  total: number;
  fecha: string;
  estado: string;
}

interface SaleDetail {
  id: number;
  folio: string;
  total: number;
  fecha: string;
  items: Array<{
    producto_id: number;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    descuento: number;
    subtotal: number;
  }>;
  pagos: Array<{
    forma_pago: string;
    monto: number;
  }>;
}

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioId: number;
}

export function ReturnModal({ isOpen, onClose, usuarioId }: ReturnModalProps) {
  const [searchFolio, setSearchFolio] = useState("");
  const [results, setResults] = useState<SaleRow[]>([]);
  const [selected, setSelected] = useState<SaleDetail | null>(null);
  const [motivo, setMotivo] = useState("");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState<{ folio: string } | null>(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchFolio.trim()) return;
    const rows = await window.api.ventasDetail.searchByFolio(searchFolio);
    setResults(rows.filter((r: SaleRow) => r.estado === "completada"));
  };

  const handleSelect = async (ventaId: number) => {
    const detail = await window.api.ventasDetail.get(ventaId);
    if (detail) setSelected(detail);
  };

  const handleReturn = async () => {
    if (!selected || !motivo.trim()) return;
    setProcessing(true);

    const result = await window.api.devoluciones.create({
      ventaId: selected.id,
      usuarioId,
      motivo,
      items: selected.items.map((i) => ({
        productoId: i.producto_id,
        nombre: i.nombre,
        cantidad: i.cantidad,
        precioUnitario: i.precio_unitario,
        subtotal: i.subtotal,
      })),
      total: selected.total,
    });

    setProcessing(false);
    setDone({ folio: result.folio });
  };

  const handleClose = () => {
    setSearchFolio("");
    setResults([]);
    setSelected(null);
    setMotivo("");
    setDone(null);
    onClose();
  };

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-pos-card border border-slate-700 rounded-2xl w-full max-w-md p-6 text-center">
          <div className="w-16 h-16 bg-pos-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <RotateCcw size={32} className="text-pos-green" />
          </div>
          <h3 className="text-lg font-semibold text-pos-text mb-2">Devolucion Registrada</h3>
          <p className="text-sm text-pos-muted mb-1">Folio: <span className="font-mono text-pos-text">{done.folio}</span></p>
          <p className="text-sm text-pos-muted mb-4">La venta original ha sido marcada como cancelada.</p>
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors cursor-pointer"
          >
            Aceptar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-pos-card border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <RotateCcw size={20} className="text-pos-red" />
            <h2 className="text-lg font-semibold text-pos-text">Devolucion</h2>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-pos-active rounded-lg transition-colors cursor-pointer">
            <X size={20} className="text-pos-muted" />
          </button>
        </div>

        {!selected ? (
          <div className="p-4 flex-1 overflow-auto">
            <div className="flex gap-2 mb-4">
              <input
                value={searchFolio}
                onChange={(e) => setSearchFolio(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Buscar venta por folio..."
                className="flex-1 bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-red focus:outline-none"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-pos-red text-white rounded-lg text-sm hover:bg-red-600 transition-colors cursor-pointer"
              >
                <Search size={16} />
              </button>
            </div>

            <div className="space-y-1">
              {results.map((sale) => (
                <button
                  key={sale.id}
                  onClick={() => handleSelect(sale.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-pos-active/50 transition-colors cursor-pointer text-left"
                >
                  <div>
                    <div className="text-sm text-pos-text font-mono">{sale.folio}</div>
                    <div className="text-xs text-pos-muted">{new Date(sale.fecha).toLocaleString()}</div>
                  </div>
                  <span className="text-sm font-mono text-pos-green">${sale.total.toFixed(2)}</span>
                </button>
              ))}
              {results.length === 0 && searchFolio && (
                <div className="text-center text-pos-muted py-8 text-sm">
                  Busca una venta por folio para hacer la devolucion
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 flex-1 overflow-auto space-y-4">
            <div className="bg-pos-bg border border-slate-700 rounded-xl p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-mono text-pos-text">{selected.folio}</span>
                <span className="text-sm font-semibold text-pos-green">${selected.total.toFixed(2)}</span>
              </div>
              <div className="text-xs text-pos-muted mb-3">{new Date(selected.fecha).toLocaleString()}</div>

              <div className="space-y-1">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-pos-text">
                      {item.cantidad}x {item.nombre}
                    </span>
                    <span className="text-pos-muted font-mono">${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-pos-amber mt-0.5 flex-shrink-0" />
              <span className="text-xs text-pos-amber">
                Esta accion cancelara la venta original y generara una nota de devolucion.
              </span>
            </div>

            <div>
              <label className="block text-xs text-pos-muted mb-1">Motivo de devolucion</label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Producto defectuoso, cliente cambio de opinion..."
                rows={2}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-red focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelected(null)}
                className="flex-1 px-4 py-2 text-sm text-pos-muted hover:text-pos-text transition-colors cursor-pointer"
              >
                Atras
              </button>
              <button
                onClick={handleReturn}
                disabled={!motivo.trim() || processing}
                className="flex-1 px-4 py-2 bg-pos-red text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? "Procesando..." : "Confirmar Devolucion"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
