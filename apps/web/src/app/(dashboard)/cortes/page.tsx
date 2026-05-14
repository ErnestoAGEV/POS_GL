"use client";

import { useState, useEffect } from "react";
import { Scissors, Download } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Corte {
  id: number;
  terminalId: number;
  usuarioId: number;
  tipo: string;
  efectivoInicial: number;
  efectivoSistema: number;
  efectivoDeclarado: number | null;
  diferencia: number | null;
  totalVentas: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  fechaApertura: string;
  fechaCierre: string | null;
}

export default function CortesPage() {
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCortes();
  }, [page]);

  const loadCortes = () => {
    setLoading(true);
    api.cortes
      .list(page, 50)
      .then((res) => setCortes(res.data || []))
      .catch(() => setCortes([]))
      .finally(() => setLoading(false));
  };

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "-";

  const fmtMoney = (n: number | null) =>
    n != null ? `$${n.toFixed(2)}` : "-";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors size={20} className="text-pos-amber" />
          <h1 className="text-2xl font-bold text-pos-text">Cortes de Caja</h1>
        </div>
        {cortes.length > 0 && (
          <button
            onClick={() =>
              exportToExcel(
                cortes.map((c) => ({
                  ID: c.id,
                  "Terminal ID": c.terminalId,
                  "Usuario ID": c.usuarioId,
                  Tipo: c.tipo,
                  "Ef. Inicial": c.efectivoInicial,
                  "Ef. Sistema": c.efectivoSistema,
                  "Ef. Declarado": c.efectivoDeclarado ?? "",
                  Diferencia: c.diferencia ?? "",
                  "Total Ventas": c.totalVentas,
                  Apertura: fmtDate(c.fechaApertura),
                  Cierre: fmtDate(c.fechaCierre),
                })),
                "cortes-caja"
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
              <th className="p-3 font-medium">ID</th>
              <th className="p-3 font-medium">Terminal</th>
              <th className="p-3 font-medium">Tipo</th>
              <th className="p-3 font-medium text-right">Ef. Inicial</th>
              <th className="p-3 font-medium text-right">Ef. Sistema</th>
              <th className="p-3 font-medium text-right">Ef. Declarado</th>
              <th className="p-3 font-medium text-right">Diferencia</th>
              <th className="p-3 font-medium text-right">Ventas</th>
              <th className="p-3 font-medium">Apertura</th>
              <th className="p-3 font-medium">Cierre</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : cortes.length === 0 ? (
              <tr><td colSpan={10} className="p-8 text-center text-pos-muted text-sm">No hay cortes</td></tr>
            ) : (
              cortes.map((c) => (
                <tr key={c.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-muted font-mono">#{c.id}</td>
                  <td className="p-3 text-pos-muted">T-{c.terminalId}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      c.tipo === "final" ? "bg-pos-blue/20 text-pos-blue" : "bg-pos-amber/20 text-pos-amber"
                    }`}>
                      {c.tipo}
                    </span>
                  </td>
                  <td className="p-3 text-pos-text text-right font-mono">{fmtMoney(c.efectivoInicial)}</td>
                  <td className="p-3 text-pos-text text-right font-mono">{fmtMoney(c.efectivoSistema)}</td>
                  <td className="p-3 text-pos-text text-right font-mono">{fmtMoney(c.efectivoDeclarado)}</td>
                  <td className={`p-3 text-right font-mono ${
                    c.diferencia != null && c.diferencia < 0 ? "text-pos-red" : c.diferencia != null && c.diferencia > 0 ? "text-pos-green" : "text-pos-muted"
                  }`}>
                    {fmtMoney(c.diferencia)}
                  </td>
                  <td className="p-3 text-pos-green text-right font-mono font-medium">{fmtMoney(c.totalVentas)}</td>
                  <td className="p-3 text-pos-muted text-xs">{fmtDate(c.fechaApertura)}</td>
                  <td className="p-3 text-pos-muted text-xs">{fmtDate(c.fechaCierre)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer">Anterior</button>
        <span className="px-4 py-2 text-sm text-pos-muted">Pagina {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={cortes.length < 50} className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer">Siguiente</button>
      </div>
    </div>
  );
}
