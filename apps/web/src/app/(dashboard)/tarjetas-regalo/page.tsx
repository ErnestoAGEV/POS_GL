"use client";

import { useState, useEffect } from "react";
import { CreditCard, Download } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface TarjetaRegalo {
  id: number;
  codigo: string;
  saldo: number;
  clienteId: number | null;
  activa: boolean;
  createdAt: string;
}

export default function TarjetasRegaloPage() {
  const [tarjetas, setTarjetas] = useState<TarjetaRegalo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.tarjetasRegalo
      .list()
      .then((data) => setTarjetas(Array.isArray(data) ? data : []))
      .catch(() => setTarjetas([]))
      .finally(() => setLoading(false));
  }, []);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("es-MX");

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard size={20} className="text-pos-purple" />
          <h1 className="text-2xl font-bold text-pos-text">Tarjetas de Regalo</h1>
        </div>
        {tarjetas.length > 0 && (
          <button
            onClick={() =>
              exportToExcel(
                tarjetas.map((t) => ({
                  Codigo: t.codigo,
                  Saldo: t.saldo,
                  "Cliente ID": t.clienteId ?? "",
                  Estado: t.activa ? "Activa" : "Inactiva",
                  "Fecha Creacion": fmtDate(t.createdAt),
                })),
                "tarjetas-regalo"
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
              <th className="p-3 font-medium">Codigo</th>
              <th className="p-3 font-medium text-right">Saldo</th>
              <th className="p-3 font-medium">Cliente</th>
              <th className="p-3 font-medium text-center">Estado</th>
              <th className="p-3 font-medium">Creacion</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : tarjetas.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-pos-muted text-sm">No hay tarjetas de regalo</td></tr>
            ) : (
              tarjetas.map((t) => (
                <tr key={t.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-text font-mono font-medium">{t.codigo}</td>
                  <td className={`p-3 text-right font-mono font-medium ${t.saldo > 0 ? "text-pos-green" : "text-pos-muted"}`}>
                    ${t.saldo.toFixed(2)}
                  </td>
                  <td className="p-3 text-pos-muted">{t.clienteId ? `#${t.clienteId}` : "-"}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.activa ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-pos-muted"
                    }`}>
                      {t.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="p-3 text-pos-muted text-xs">{fmtDate(t.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
