import { useState, useEffect } from "react";
import { X, Printer, Search, Receipt } from "lucide-react";

interface SaleRow {
  id: number;
  folio: string;
  total: number;
  fecha: string;
  estado: string;
}

interface ReprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sucursal: string;
  terminal: string;
  cajero: string;
}

export function ReprintModal({ isOpen, onClose, sucursal, terminal, cajero }: ReprintModalProps) {
  const [recent, setRecent] = useState<SaleRow[]>([]);
  const [searchFolio, setSearchFolio] = useState("");
  const [searchResults, setSearchResults] = useState<SaleRow[] | null>(null);
  const [ticketPreview, setTicketPreview] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      window.api.ventasDetail.recent(15).then(setRecent);
      setSearchResults(null);
      setSearchFolio("");
      setTicketPreview(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!searchFolio.trim()) return;
    const results = await window.api.ventasDetail.searchByFolio(searchFolio);
    setSearchResults(results);
  };

  const handlePreview = async (ventaId: number) => {
    const detail = await window.api.ventasDetail.get(ventaId);
    if (!detail) return;

    const data = {
      folio: detail.folio,
      fecha: detail.fecha,
      sucursal,
      terminal,
      cajero,
      items: detail.items.map((i: any) => ({
        nombre: i.nombre,
        cantidad: i.cantidad,
        precioUnitario: i.precio_unitario,
        descuento: i.descuento,
        subtotal: i.subtotal,
      })),
      subtotal: detail.subtotal,
      descuento: detail.descuento,
      iva: detail.iva,
      total: detail.total,
      pagos: detail.pagos.map((p: any) => ({
        formaPago: p.forma_pago,
        monto: p.monto,
      })),
    };

    const text = await window.api.ticket.preview(data);
    setTicketPreview(text);
  };

  const handlePrint = async (ventaId: number) => {
    setPrinting(true);
    const detail = await window.api.ventasDetail.get(ventaId);
    if (!detail) {
      setPrinting(false);
      return;
    }

    const data = {
      folio: detail.folio,
      fecha: detail.fecha,
      sucursal,
      terminal,
      cajero,
      items: detail.items.map((i: any) => ({
        nombre: i.nombre,
        cantidad: i.cantidad,
        precioUnitario: i.precio_unitario,
        descuento: i.descuento,
        subtotal: i.subtotal,
      })),
      subtotal: detail.subtotal,
      descuento: detail.descuento,
      iva: detail.iva,
      total: detail.total,
      pagos: detail.pagos.map((p: any) => ({
        formaPago: p.forma_pago,
        monto: p.monto,
      })),
    };

    const result = await window.api.ticket.print(data);
    if (!result.success && result.error) {
      // Show text preview as fallback
      setTicketPreview(result.text);
    }
    setPrinting(false);
  };

  const sales = searchResults ?? recent;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-pos-card border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Receipt size={20} className="text-pos-blue" />
            <h2 className="text-lg font-semibold text-pos-text">Reimprimir Ticket</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-pos-active rounded-lg transition-colors cursor-pointer">
            <X size={20} className="text-pos-muted" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700">
          <div className="flex gap-2">
            <input
              value={searchFolio}
              onChange={(e) => setSearchFolio(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Buscar por folio..."
              className="flex-1 bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-blue focus:outline-none"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-pos-blue text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors cursor-pointer"
            >
              <Search size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto flex">
          <div className="flex-1 border-r border-slate-700">
            <div className="p-2 text-xs text-pos-muted font-medium px-4 pt-3">
              {searchResults ? "Resultados" : "Ventas recientes"}
            </div>
            <div className="space-y-1 p-2">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-pos-active/50 transition-colors cursor-pointer"
                  onClick={() => handlePreview(sale.id)}
                >
                  <div>
                    <div className="text-sm text-pos-text font-mono">{sale.folio}</div>
                    <div className="text-xs text-pos-muted">
                      {new Date(sale.fecha).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-pos-green">${sale.total.toFixed(2)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrint(sale.id);
                      }}
                      disabled={printing}
                      className="p-1.5 rounded-lg bg-pos-blue/20 text-pos-blue hover:bg-pos-blue/30 transition-colors cursor-pointer disabled:opacity-50"
                      title="Imprimir"
                    >
                      <Printer size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {sales.length === 0 && (
                <div className="text-center text-pos-muted py-8 text-sm">
                  No se encontraron ventas
                </div>
              )}
            </div>
          </div>

          {ticketPreview && (
            <div className="w-72 p-4">
              <div className="text-xs text-pos-muted font-medium mb-2">Vista previa</div>
              <pre className="bg-white text-black text-[10px] leading-tight p-3 rounded-lg font-mono whitespace-pre-wrap overflow-auto max-h-96">
                {ticketPreview}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
