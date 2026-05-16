"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Download, Search, Eye, X } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Venta {
  id: number;
  folio: string;
  total: number;
  subtotal: number;
  descuento: number;
  iva: number;
  tipo: string;
  estado: string;
  fecha: string;
}

interface VentaDetalle {
  id: number;
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

interface Pago {
  id: number;
  formaPago: string;
  monto: number;
  referencia: string | null;
}

interface VentaFull extends Venta {
  detalles: VentaDetalle[];
  pagos: Pago[];
}

const ESTADO_STYLES: Record<string, string> = {
  completada: "bg-green-500/20 text-green-400",
  cancelada: "bg-red-500/20 text-red-400",
  en_espera: "bg-amber-500/20 text-amber-400",
  cotizacion: "bg-blue-500/20 text-blue-400",
};

const FORMA_PAGO_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  credito: "Credito",
  vale_despensa: "Vale Despensa",
  tarjeta_regalo: "T. Regalo",
};

function defaultDesde() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function defaultHasta() {
  return new Date().toISOString().split("T")[0];
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState(defaultDesde);
  const [hasta, setHasta] = useState(defaultHasta);
  const [folioFilter, setFolioFilter] = useState("");
  const [detail, setDetail] = useState<VentaFull | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.ventas
      .list(page, 50, { desde, hasta })
      .then((res) => setVentas(res.data || res))
      .catch(() => setVentas([]))
      .finally(() => setLoading(false));
  }, [page, desde, hasta]);

  const filtered = folioFilter
    ? ventas.filter((v) => v.folio.toLowerCase().includes(folioFilter.toLowerCase()))
    : ventas;

  const openDetail = async (id: number) => {
    setLoadingDetail(true);
    setDetail(null);
    try {
      const data = await api.ventas.get(id);
      setDetail(data);
    } catch {
      // handled by api client
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart size={20} className="text-pos-green" />
          <h1 className="text-2xl font-bold text-pos-text">Ventas</h1>
        </div>
        {ventas.length > 0 && (
          <button
            onClick={() =>
              exportToExcel(
                filtered.map((v) => ({
                  Folio: v.folio,
                  Fecha: new Date(v.fecha).toLocaleString(),
                  Tipo: v.tipo,
                  Subtotal: v.subtotal,
                  Descuento: v.descuento,
                  IVA: v.iva,
                  Total: v.total,
                  Estado: v.estado,
                })),
                "ventas"
              )
            }
            className="flex items-center gap-2 px-4 py-2 bg-pos-green/20 text-pos-green rounded-lg text-sm hover:bg-pos-green/30 transition-colors cursor-pointer"
          >
            <Download size={16} />
            Exportar Excel
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted" />
          <input
            placeholder="Filtrar por folio..."
            value={folioFilter}
            onChange={(e) => setFolioFilter(e.target.value)}
            className="bg-pos-card border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50 w-56"
          />
        </div>
        <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1); }} className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm" />
        <span className="text-pos-muted text-sm">a</span>
        <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1); }} className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm" />
      </div>

      <div className="bg-pos-card border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-pos-muted border-b border-slate-700">
              <th className="p-3 font-medium">Folio</th>
              <th className="p-3 font-medium">Fecha</th>
              <th className="p-3 font-medium">Tipo</th>
              <th className="p-3 font-medium text-right">Subtotal</th>
              <th className="p-3 font-medium text-right">Descuento</th>
              <th className="p-3 font-medium text-right">IVA</th>
              <th className="p-3 font-medium text-right">Total</th>
              <th className="p-3 font-medium text-center">Estado</th>
              <th className="p-3 font-medium text-center">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-pos-muted text-sm">No hay ventas registradas</td></tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-text font-mono text-xs">{v.folio}</td>
                  <td className="p-3 text-pos-muted text-xs">{new Date(v.fecha).toLocaleString()}</td>
                  <td className="p-3 text-pos-muted">{v.tipo}</td>
                  <td className="p-3 text-pos-text text-right font-mono">${v.subtotal.toFixed(2)}</td>
                  <td className="p-3 text-pos-amber text-right font-mono">{v.descuento > 0 ? `-$${v.descuento.toFixed(2)}` : "-"}</td>
                  <td className="p-3 text-pos-muted text-right font-mono">${v.iva.toFixed(2)}</td>
                  <td className="p-3 text-pos-green text-right font-mono font-semibold">${v.total.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[v.estado] || ""}`}>{v.estado}</span>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => openDetail(v.id)} className="p-1.5 text-pos-muted hover:text-pos-blue transition-colors cursor-pointer" title="Ver detalle">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer">Anterior</button>
        <span className="px-4 py-2 text-sm text-pos-muted">Pagina {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={ventas.length < 50} className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer">Siguiente</button>
      </div>

      {/* Sale detail modal */}
      {(detail || loadingDetail) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-pos-card border border-slate-700 rounded-xl w-full max-w-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            {loadingDetail ? (
              <p className="text-center text-pos-muted py-8">Cargando detalle...</p>
            ) : detail && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-pos-text">Venta {detail.folio}</h2>
                    <p className="text-xs text-pos-muted">{new Date(detail.fecha).toLocaleString()} &middot; {detail.tipo} &middot; <span className={ESTADO_STYLES[detail.estado] ? "font-medium" : ""}>{detail.estado}</span></p>
                  </div>
                  <button onClick={() => setDetail(null)} className="text-pos-muted hover:text-pos-text cursor-pointer">
                    <X size={20} />
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-pos-muted mb-2">Productos ({detail.detalles.length})</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-pos-muted border-b border-slate-700">
                        <th className="text-left pb-2">Prod ID</th>
                        <th className="text-right pb-2">Cant</th>
                        <th className="text-right pb-2">P.Unit</th>
                        <th className="text-right pb-2">Desc</th>
                        <th className="text-right pb-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.detalles.map((d) => (
                        <tr key={d.id} className="border-b border-slate-800">
                          <td className="py-1.5 text-pos-text font-mono">#{d.productoId}</td>
                          <td className="py-1.5 text-right text-pos-text">{d.cantidad}</td>
                          <td className="py-1.5 text-right text-pos-muted font-mono">${d.precioUnitario.toFixed(2)}</td>
                          <td className="py-1.5 text-right text-pos-amber font-mono">{d.descuento > 0 ? `$${d.descuento.toFixed(2)}` : "-"}</td>
                          <td className="py-1.5 text-right text-pos-green font-mono">${d.subtotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-pos-muted mb-2">Pagos ({detail.pagos.length})</h3>
                  <div className="space-y-1">
                    {detail.pagos.map((p) => (
                      <div key={p.id} className="flex justify-between text-sm">
                        <span className="text-pos-text">{FORMA_PAGO_LABELS[p.formaPago] || p.formaPago}</span>
                        <span className="text-pos-green font-mono">${p.monto.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-3 space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-pos-muted">Subtotal</span><span className="text-pos-text font-mono">${detail.subtotal.toFixed(2)}</span></div>
                  {detail.descuento > 0 && <div className="flex justify-between text-sm"><span className="text-pos-muted">Descuento</span><span className="text-pos-amber font-mono">-${detail.descuento.toFixed(2)}</span></div>}
                  <div className="flex justify-between text-sm"><span className="text-pos-muted">IVA</span><span className="text-pos-text font-mono">${detail.iva.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm font-bold"><span className="text-pos-text">Total</span><span className="text-pos-green font-mono">${detail.total.toFixed(2)}</span></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
