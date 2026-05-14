"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Download, Search } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface BitacoraEntry {
  id: number;
  usuarioId: number;
  accion: string;
  entidad: string;
  entidadId: number | null;
  descripcion: string | null;
  fecha: string;
}

export default function BitacoraPage() {
  const [entries, setEntries] = useState<BitacoraEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [accion, setAccion] = useState("");
  const [entidad, setEntidad] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = () => {
    setLoading(true);
    api.bitacora
      .list({
        accion: accion || undefined,
        entidad: entidad || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      })
      .then((data) => setEntries(Array.isArray(data) ? data : data.data || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={20} className="text-pos-muted" />
          <h1 className="text-2xl font-bold text-pos-text">Bitacora</h1>
        </div>
        {entries.length > 0 && (
          <button
            onClick={() =>
              exportToExcel(
                entries.map((e) => ({
                  Fecha: fmtDate(e.fecha),
                  "Usuario ID": e.usuarioId,
                  Accion: e.accion,
                  Entidad: e.entidad,
                  "Entidad ID": e.entidadId ?? "",
                  Descripcion: e.descripcion || "",
                })),
                "bitacora"
              )
            }
            className="flex items-center gap-2 px-4 py-2 bg-pos-green/20 text-pos-green rounded-lg text-sm hover:bg-pos-green/30 transition-colors cursor-pointer"
          >
            <Download size={16} />
            Excel
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          placeholder="Accion"
          value={accion}
          onChange={(e) => setAccion(e.target.value)}
          className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50 w-40"
        />
        <input
          placeholder="Entidad"
          value={entidad}
          onChange={(e) => setEntidad(e.target.value)}
          className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50 w-40"
        />
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm"
        />
        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm"
        />
        <button
          onClick={loadEntries}
          className="flex items-center gap-2 px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 transition-colors cursor-pointer"
        >
          <Search size={16} />
          Buscar
        </button>
      </div>

      <div className="bg-pos-card border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-pos-muted border-b border-slate-700">
              <th className="p-3 font-medium">Fecha</th>
              <th className="p-3 font-medium">Usuario</th>
              <th className="p-3 font-medium">Accion</th>
              <th className="p-3 font-medium">Entidad</th>
              <th className="p-3 font-medium">ID</th>
              <th className="p-3 font-medium">Descripcion</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-pos-muted text-sm">No hay registros</td></tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-muted text-xs whitespace-nowrap">{fmtDate(e.fecha)}</td>
                  <td className="p-3 text-pos-muted">U-{e.usuarioId}</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-pos-blue/20 text-pos-blue rounded text-xs">{e.accion}</span></td>
                  <td className="p-3 text-pos-text">{e.entidad}</td>
                  <td className="p-3 text-pos-muted font-mono">{e.entidadId ?? "-"}</td>
                  <td className="p-3 text-pos-muted text-xs max-w-xs truncate" title={e.descripcion || ""}>{e.descripcion || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
