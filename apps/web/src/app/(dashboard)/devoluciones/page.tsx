"use client";

import { useState, useEffect } from "react";
import { RotateCcw, Download } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Devolucion {
  id: number;
  ventaId: number;
  folio: string;
  usuarioId: number;
  motivo: string;
  total: number;
  itemsJson: string;
  fecha: string;
}

export default function DevolucionesPage() {
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.devoluciones
      .list()
      .then((data) => setDevoluciones(Array.isArray(data) ? data : []))
      .catch(() => setDevoluciones([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw size={20} className="text-pos-red" />
          <h1 className="text-2xl font-bold text-pos-text">Devoluciones</h1>
        </div>
        {devoluciones.length > 0 && (
          <button
            onClick={() =>
              exportToExcel(
                devoluciones.map((d) => ({
                  Folio: d.folio,
                  "Venta ID": d.ventaId,
                  Motivo: d.motivo,
                  Total: d.total,
                  Fecha: new Date(d.fecha).toLocaleString(),
                })),
                "devoluciones"
              )
            }
            className="flex items-center gap-2 px-4 py-2 bg-pos-green/20 text-pos-green rounded-lg text-sm hover:bg-pos-green/30 transition-colors cursor-pointer"
          >
            <Download size={16} />
            Excel
          </button>
        )}
      </div>

      <div className="bg-pos-card border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-pos-muted border-b border-slate-700">
              <th className="p-3 font-medium">Folio</th>
              <th className="p-3 font-medium">Venta</th>
              <th className="p-3 font-medium">Motivo</th>
              <th className="p-3 font-medium">Items</th>
              <th className="p-3 font-medium text-right">Total</th>
              <th className="p-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : devoluciones.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-pos-muted text-sm">No hay devoluciones</td></tr>
            ) : (
              devoluciones.map((d) => {
                let itemCount = 0;
                try { itemCount = JSON.parse(d.itemsJson).length; } catch {}
                return (
                  <tr key={d.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                    <td className="p-3 text-pos-text font-mono text-xs">{d.folio}</td>
                    <td className="p-3 text-pos-muted font-mono text-xs">#{d.ventaId}</td>
                    <td className="p-3 text-pos-muted max-w-[200px] truncate">{d.motivo}</td>
                    <td className="p-3 text-pos-muted">{itemCount} producto{itemCount !== 1 ? "s" : ""}</td>
                    <td className="p-3 text-pos-red text-right font-mono font-semibold">-${d.total.toFixed(2)}</td>
                    <td className="p-3 text-pos-muted text-xs">{new Date(d.fecha).toLocaleDateString("es-MX")}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
