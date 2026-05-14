"use client";

import { useState, useEffect } from "react";
import { PackageCheck, Download } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Apartado {
  id: number;
  ventaId: number;
  clienteId: number | null;
  enganche: number;
  saldoPendiente: number;
  total: number;
  estado: string;
  fechaLimite: string | null;
  fecha: string;
}

const ESTADO_STYLES: Record<string, string> = {
  activo: "bg-pos-amber/20 text-pos-amber",
  liquidado: "bg-green-500/20 text-green-400",
  cancelado: "bg-pos-red/20 text-pos-red",
};

export default function ApartadosPage() {
  const [apartados, setApartados] = useState<Apartado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");

  useEffect(() => {
    loadApartados();
  }, [filtroEstado]);

  const loadApartados = () => {
    setLoading(true);
    api.apartados
      .list(filtroEstado || undefined)
      .then((data) => setApartados(Array.isArray(data) ? data : []))
      .catch(() => setApartados([]))
      .finally(() => setLoading(false));
  };

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("es-MX") : "-";

  const fmtMoney = (n: number) => `$${n.toFixed(2)}`;

  const progress = (a: Apartado) => {
    if (a.total === 0) return 0;
    return Math.min(100, Math.round(((a.total - a.saldoPendiente) / a.total) * 100));
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackageCheck size={20} className="text-pos-amber" />
          <h1 className="text-2xl font-bold text-pos-text">Apartados</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="activo">Activos</option>
            <option value="liquidado">Liquidados</option>
            <option value="cancelado">Cancelados</option>
          </select>
          {apartados.length > 0 && (
            <button
              onClick={() =>
                exportToExcel(
                  apartados.map((a) => ({
                    ID: a.id,
                    "Venta ID": a.ventaId,
                    "Cliente ID": a.clienteId ?? "",
                    Enganche: a.enganche,
                    "Saldo Pendiente": a.saldoPendiente,
                    Total: a.total,
                    "Progreso %": progress(a),
                    Estado: a.estado,
                    "Fecha Limite": fmtDate(a.fechaLimite),
                    Fecha: fmtDate(a.fecha),
                  })),
                  "apartados"
                )
              }
              className="flex items-center gap-2 px-4 py-2 bg-pos-green/20 text-pos-green rounded-lg text-sm hover:bg-pos-green/30 transition-colors cursor-pointer"
            >
              <Download size={16} />
              Excel
            </button>
          )}
        </div>
      </div>

      <div className="bg-pos-card border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-pos-muted border-b border-slate-700">
              <th className="p-3 font-medium">ID</th>
              <th className="p-3 font-medium">Venta</th>
              <th className="p-3 font-medium text-right">Enganche</th>
              <th className="p-3 font-medium text-right">Saldo</th>
              <th className="p-3 font-medium text-right">Total</th>
              <th className="p-3 font-medium">Progreso</th>
              <th className="p-3 font-medium text-center">Estado</th>
              <th className="p-3 font-medium">Limite</th>
              <th className="p-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : apartados.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-pos-muted text-sm">No hay apartados</td></tr>
            ) : (
              apartados.map((a) => (
                <tr key={a.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-muted font-mono">#{a.id}</td>
                  <td className="p-3 text-pos-muted font-mono">V-{a.ventaId}</td>
                  <td className="p-3 text-pos-text text-right font-mono">{fmtMoney(a.enganche)}</td>
                  <td className="p-3 text-pos-amber text-right font-mono">{fmtMoney(a.saldoPendiente)}</td>
                  <td className="p-3 text-pos-text text-right font-mono font-medium">{fmtMoney(a.total)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pos-green rounded-full transition-all"
                          style={{ width: `${progress(a)}%` }}
                        />
                      </div>
                      <span className="text-xs text-pos-muted w-8">{progress(a)}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[a.estado] || "bg-slate-700 text-pos-muted"}`}>
                      {a.estado}
                    </span>
                  </td>
                  <td className="p-3 text-pos-muted text-xs">{fmtDate(a.fechaLimite)}</td>
                  <td className="p-3 text-pos-muted text-xs">{fmtDate(a.fecha)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
