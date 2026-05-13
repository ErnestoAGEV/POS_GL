import { useState, useEffect } from "react";
import { FileText, Plus, Ban } from "lucide-react";
import { Button } from "../components/ui/Button";
import { CreateInvoiceModal } from "../components/invoices/CreateInvoiceModal";
import { formatCurrency, formatDate } from "../lib/format";

const TIPO_LABELS: Record<string, string> = {
  individual: "Individual",
  global: "Global",
  nota_credito: "Nota de Credito",
  complemento: "Complemento",
};

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    const result = await window.api.facturas.list();
    setInvoices(result);
  };

  const handleCancel = async (id: number) => {
    await window.api.facturas.cancel(id);
    loadInvoices();
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-pos-text text-xl font-semibold flex items-center gap-2">
          <FileText size={22} />
          Facturas CFDI
        </h1>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} className="mr-1" />
          Nueva Factura
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
        <p className="text-pos-amber text-sm">
          Modulo de facturacion en modo simulacion. El timbrado real con PAC
          (Finkok) se habilitara al configurar las credenciales del emisor. Los
          UUID generados actualmente son locales.
        </p>
      </div>

      {/* Invoices table */}
      {invoices.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-pos-muted">
          <div className="text-center">
            <FileText size={64} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg">Sin facturas</p>
            <p className="text-sm mt-1">
              Crea tu primera factura seleccionando una venta
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-pos-card border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-pos-muted text-xs uppercase tracking-wider border-b border-slate-700 bg-pos-bg">
                <th className="text-left py-3 px-4">Folio</th>
                <th className="text-left py-3 px-4">UUID Fiscal</th>
                <th className="text-left py-3 px-4">Cliente</th>
                <th className="text-center py-3 px-4">Tipo</th>
                <th className="text-right py-3 px-4">Total</th>
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-center py-3 px-4">Estado</th>
                <th className="text-center py-3 px-4 w-20">Accion</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-slate-800 hover:bg-pos-active/30 transition-colors"
                >
                  <td className="py-3 px-4 text-pos-text font-mono text-sm">
                    {f.serieSat}-{f.folioSat}
                  </td>
                  <td className="py-3 px-4 text-pos-muted font-mono text-xs max-w-[200px] truncate">
                    {f.uuidFiscal || "\u2014"}
                  </td>
                  <td className="py-3 px-4 text-pos-text text-sm">
                    {f.clienteNombre || "\u2014"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-xs bg-blue-500/20 text-pos-blue px-2 py-0.5 rounded-full">
                      {TIPO_LABELS[f.tipo] || f.tipo}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-pos-green font-medium tabular-nums">
                    {formatCurrency(f.total || 0)}
                  </td>
                  <td className="py-3 px-4 text-pos-muted text-sm">
                    {f.fecha ? formatDate(f.fecha) : "\u2014"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        f.estado === "timbrada"
                          ? "bg-green-500/20 text-pos-green"
                          : "bg-red-500/20 text-pos-red"
                      }`}
                    >
                      {f.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {f.estado === "timbrada" && (
                      <button
                        onClick={() => handleCancel(f.id)}
                        className="text-pos-muted hover:text-pos-red cursor-pointer transition-colors"
                        aria-label="Cancelar factura"
                        title="Cancelar"
                      >
                        <Ban size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateInvoiceModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadInvoices}
      />
    </div>
  );
}
