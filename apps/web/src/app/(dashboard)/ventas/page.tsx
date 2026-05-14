"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Download, Search } from "lucide-react";
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

const ESTADO_STYLES: Record<string, string> = {
  completada: "bg-green-500/20 text-green-400",
  cancelada: "bg-red-500/20 text-red-400",
  en_espera: "bg-amber-500/20 text-amber-400",
  cotizacion: "bg-blue-500/20 text-blue-400",
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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-pos-muted text-sm">No hay ventas registradas</td></tr>
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
    </div>
  );
}
