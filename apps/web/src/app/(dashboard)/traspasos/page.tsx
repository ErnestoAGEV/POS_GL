"use client";

import { useState, useEffect } from "react";
import { ArrowLeftRight, Download, Send, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-amber-500/20 text-amber-400",
  en_transito: "bg-blue-500/20 text-blue-400",
  recibido: "bg-green-500/20 text-green-400",
  cancelado: "bg-red-500/20 text-red-400",
};

interface Traspaso {
  id: number;
  sucursalOrigenId: number;
  sucursalDestinoId: number;
  estado: string;
  notas: string | null;
  fecha: string;
}

export default function TraspasosPage() {
  const [traspasos, setTraspasos] = useState<Traspaso[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    api.traspasos
      .list(page, 50, filter || undefined)
      .then((res) => setTraspasos(res.data || []))
      .catch(() => setTraspasos([]))
      .finally(() => setLoading(false));
  }, [page, filter]);

  const handleEnviar = async (id: number) => {
    await api.traspasos.enviar(id);
    setTraspasos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, estado: "en_transito" } : t))
    );
  };

  const handleRecibir = async (id: number) => {
    await api.traspasos.recibir(id);
    setTraspasos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, estado: "recibido" } : t))
    );
  };

  const handleCancelar = async (id: number) => {
    await api.traspasos.cancelar(id);
    setTraspasos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, estado: "cancelado" } : t))
    );
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={20} className="text-purple-400" />
          <h1 className="text-2xl font-bold text-pos-text">Traspasos</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_transito">En Transito</option>
            <option value="recibido">Recibidos</option>
            <option value="cancelado">Cancelados</option>
          </select>
          {traspasos.length > 0 && (
            <button
              onClick={() =>
                exportToExcel(
                  traspasos.map((t) => ({
                    ID: t.id,
                    "Sucursal Origen": t.sucursalOrigenId,
                    "Sucursal Destino": t.sucursalDestinoId,
                    Estado: t.estado,
                    Fecha: new Date(t.fecha).toLocaleString(),
                    Notas: t.notas || "",
                  })),
                  "traspasos"
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
              <th className="p-3 font-medium">Origen</th>
              <th className="p-3 font-medium">Destino</th>
              <th className="p-3 font-medium text-center">Estado</th>
              <th className="p-3 font-medium">Notas</th>
              <th className="p-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-pos-muted text-sm">Cargando...</td>
              </tr>
            ) : traspasos.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-pos-muted text-sm">No hay traspasos registrados</td>
              </tr>
            ) : (
              traspasos.map((t) => (
                <tr key={t.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-muted font-mono text-xs">#{t.id}</td>
                  <td className="p-3 text-pos-muted text-xs">{new Date(t.fecha).toLocaleDateString("es-MX")}</td>
                  <td className="p-3 text-pos-text">Suc. #{t.sucursalOrigenId}</td>
                  <td className="p-3 text-pos-text">Suc. #{t.sucursalDestinoId}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[t.estado] || ""}`}>
                      {t.estado}
                    </span>
                  </td>
                  <td className="p-3 text-pos-muted text-xs max-w-[150px] truncate">{t.notas || "-"}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {t.estado === "pendiente" && (
                        <>
                          <button
                            onClick={() => handleEnviar(t.id)}
                            className="p-1.5 rounded-lg bg-pos-blue/20 text-pos-blue hover:bg-pos-blue/30 cursor-pointer"
                            title="Enviar"
                          >
                            <Send size={14} />
                          </button>
                          <button
                            onClick={() => handleCancelar(t.id)}
                            className="p-1.5 rounded-lg bg-pos-red/20 text-pos-red hover:bg-pos-red/30 cursor-pointer"
                            title="Cancelar"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      {t.estado === "en_transito" && (
                        <>
                          <button
                            onClick={() => handleRecibir(t.id)}
                            className="p-1.5 rounded-lg bg-pos-green/20 text-pos-green hover:bg-pos-green/30 cursor-pointer"
                            title="Recibir"
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button
                            onClick={() => handleCancelar(t.id)}
                            className="p-1.5 rounded-lg bg-pos-red/20 text-pos-red hover:bg-pos-red/30 cursor-pointer"
                            title="Cancelar"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                    </div>
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
          disabled={traspasos.length < 50}
          className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
