"use client";

import { useState, useEffect } from "react";
import { Truck, Download, Package2, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-amber-500/20 text-amber-400",
  recibida: "bg-green-500/20 text-green-400",
  cancelada: "bg-red-500/20 text-red-400",
};

interface Compra {
  id: number;
  proveedorId: number;
  sucursalId: number;
  total: number;
  estado: string;
  notas: string | null;
  fecha: string;
  fechaRecepcion: string | null;
}

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    api.compras
      .list(page, 50, filter || undefined)
      .then((res) => setCompras(res.data || []))
      .catch(() => setCompras([]))
      .finally(() => setLoading(false));
  }, [page, filter]);

  const handleRecibir = async (id: number) => {
    await api.compras.recibir(id);
    setCompras((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: "recibida", fechaRecepcion: new Date().toISOString() } : c))
    );
  };

  const handleCancelar = async (id: number) => {
    await api.compras.cancelar(id);
    setCompras((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: "cancelada" } : c))
    );
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck size={20} className="text-pos-blue" />
          <h1 className="text-2xl font-bold text-pos-text">Compras</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="recibida">Recibidas</option>
            <option value="cancelada">Canceladas</option>
          </select>
          {compras.length > 0 && (
            <button
              onClick={() =>
                exportToExcel(
                  compras.map((c) => ({
                    ID: c.id,
                    Proveedor: c.proveedorId,
                    Sucursal: c.sucursalId,
                    Total: c.total,
                    Estado: c.estado,
                    Fecha: new Date(c.fecha).toLocaleString(),
                    Notas: c.notas || "",
                  })),
                  "compras"
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
              <th className="p-3 font-medium">Fecha</th>
              <th className="p-3 font-medium">Proveedor</th>
              <th className="p-3 font-medium">Sucursal</th>
              <th className="p-3 font-medium text-right">Total</th>
              <th className="p-3 font-medium text-center">Estado</th>
              <th className="p-3 font-medium">Notas</th>
              <th className="p-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-pos-muted text-sm">Cargando...</td>
              </tr>
            ) : compras.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-pos-muted text-sm">No hay compras registradas</td>
              </tr>
            ) : (
              compras.map((c) => (
                <tr key={c.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-muted font-mono text-xs">#{c.id}</td>
                  <td className="p-3 text-pos-muted text-xs">{new Date(c.fecha).toLocaleDateString("es-MX")}</td>
                  <td className="p-3 text-pos-text">Prov. #{c.proveedorId}</td>
                  <td className="p-3 text-pos-muted">Suc. #{c.sucursalId}</td>
                  <td className="p-3 text-pos-green text-right font-mono font-semibold">${c.total.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[c.estado] || ""}`}>
                      {c.estado}
                    </span>
                  </td>
                  <td className="p-3 text-pos-muted text-xs max-w-[150px] truncate">{c.notas || "-"}</td>
                  <td className="p-3 text-center">
                    {c.estado === "pendiente" && (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleRecibir(c.id)}
                          className="p-1.5 rounded-lg bg-pos-green/20 text-pos-green hover:bg-pos-green/30 cursor-pointer"
                          title="Recibir"
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          onClick={() => handleCancelar(c.id)}
                          className="p-1.5 rounded-lg bg-pos-red/20 text-pos-red hover:bg-pos-red/30 cursor-pointer"
                          title="Cancelar"
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer"
        >
          Anterior
        </button>
        <span className="px-4 py-2 text-sm text-pos-muted">Pagina {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={compras.length < 50}
          className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
