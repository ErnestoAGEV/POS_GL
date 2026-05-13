import { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { formatCurrency } from "../../lib/format";
import { Search } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateInvoiceModal({ isOpen, onClose, onCreated }: Props) {
  const [sales, setSales] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientQuery, setClientQuery] = useState("");
  const [selectedSales, setSelectedSales] = useState<Set<number>>(new Set());
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [tipo, setTipo] = useState<string>("individual");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSales();
      setSelectedSales(new Set());
      setSelectedClient(null);
      setClientQuery("");
      setTipo("individual");
    }
  }, [isOpen]);

  const loadSales = async () => {
    const result = await window.api.facturas.recentSales();
    setSales(result);
  };

  const searchClients = async (q: string) => {
    setClientQuery(q);
    if (q.trim()) {
      const result = await window.api.clients.list(q);
      setClients(result);
    } else {
      setClients([]);
    }
  };

  const toggleSale = (id: number) => {
    setSelectedSales((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const total = sales
    .filter((s) => selectedSales.has(s.id))
    .reduce((sum, s) => sum + s.total, 0);

  const handleCreate = async () => {
    if (selectedSales.size === 0 || !selectedClient) return;
    setSaving(true);

    await window.api.facturas.create({
      ventaIds: Array.from(selectedSales),
      clienteId: selectedClient.id,
      tipo,
      total,
    });

    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Factura">
      <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4">
        {/* Type */}
        <div>
          <p className="text-pos-muted text-xs uppercase tracking-wider mb-2">
            Tipo de Comprobante
          </p>
          <div className="flex gap-2">
            {[
              { id: "individual", label: "Individual" },
              { id: "global", label: "Global" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTipo(t.id)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  tipo === t.id
                    ? "bg-blue-500/20 text-pos-blue border border-blue-500/50"
                    : "bg-pos-bg text-pos-muted border border-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Client search */}
        <div>
          <p className="text-pos-muted text-xs uppercase tracking-wider mb-2">
            Cliente (Receptor)
          </p>
          {selectedClient ? (
            <div className="flex items-center justify-between bg-pos-bg border border-slate-700 rounded-lg px-4 py-3">
              <div>
                <p className="text-pos-text font-medium text-sm">
                  {selectedClient.nombre}
                </p>
                <p className="text-pos-muted text-xs">
                  RFC: {selectedClient.rfc || "Sin RFC"}
                </p>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-pos-muted hover:text-pos-red text-xs cursor-pointer"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div>
              <div className="relative mb-2">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted"
                  size={16}
                />
                <input
                  type="text"
                  value={clientQuery}
                  onChange={(e) => searchClients(e.target.value)}
                  placeholder="Buscar cliente por nombre o RFC..."
                  className="w-full bg-pos-bg border border-slate-700 text-pos-text placeholder:text-slate-500 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pos-blue"
                />
              </div>
              {clients.length > 0 && (
                <div className="border border-slate-700 rounded-lg max-h-32 overflow-y-auto">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedClient(c);
                        setClients([]);
                        setClientQuery("");
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-pos-active/50 cursor-pointer transition-colors"
                    >
                      <span className="text-pos-text">{c.nombre}</span>
                      {c.rfc && (
                        <span className="text-pos-muted ml-2 text-xs">
                          {c.rfc}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Select sales */}
        <div>
          <p className="text-pos-muted text-xs uppercase tracking-wider mb-2">
            Ventas a Facturar ({selectedSales.size} seleccionadas)
          </p>
          <div className="border border-slate-700 rounded-lg max-h-48 overflow-y-auto">
            {sales.length === 0 ? (
              <p className="text-pos-muted text-sm p-3">Sin ventas recientes</p>
            ) : (
              sales.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-pos-active/30 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSales.has(s.id)}
                    onChange={() => toggleSale(s.id)}
                    className="rounded border-slate-600"
                  />
                  <span className="text-pos-text text-sm font-mono flex-1">
                    {s.folio}
                  </span>
                  <span className="text-pos-muted text-xs">
                    {s.fecha
                      ? new Date(s.fecha).toLocaleDateString("es-MX")
                      : ""}
                  </span>
                  <span className="text-pos-green text-sm font-medium tabular-nums">
                    {formatCurrency(s.total)}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Total */}
        {selectedSales.size > 0 && (
          <div className="bg-pos-bg rounded-lg p-4 flex justify-between items-center">
            <span className="text-pos-muted font-medium">Total a Facturar</span>
            <span className="text-pos-green text-xl font-bold tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleCreate}
          disabled={saving || selectedSales.size === 0 || !selectedClient}
        >
          {saving ? "Generando..." : "Generar Factura"}
        </Button>
      </div>
    </Modal>
  );
}
