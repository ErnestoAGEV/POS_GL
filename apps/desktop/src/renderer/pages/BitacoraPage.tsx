import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Search, Filter } from "lucide-react";

interface BitacoraEntry {
  id: number;
  accion: string;
  entidad: string;
  entidadId: number | null;
  descripcion: string | null;
  fecha: string;
}

const ACCION_COLORS: Record<string, string> = {
  crear: "bg-green-500/20 text-pos-green",
  actualizar: "bg-blue-500/20 text-pos-blue",
  eliminar: "bg-red-500/20 text-pos-red",
  login: "bg-amber-500/20 text-pos-amber",
  cancelar: "bg-red-500/20 text-pos-red",
  venta: "bg-green-500/20 text-pos-green",
};

export function BitacoraPage() {
  const [entries, setEntries] = useState<BitacoraEntry[]>([]);
  const [filters, setFilters] = useState({
    accion: "",
    entidad: "",
    desde: "",
    hasta: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    const f: Record<string, string | number> = { limit: 200 };
    if (filters.accion) f.accion = filters.accion;
    if (filters.entidad) f.entidad = filters.entidad;
    if (filters.desde) f.desde = filters.desde;
    if (filters.hasta) f.hasta = filters.hasta;
    const rows = await window.api.bitacora.list(f);
    setEntries(rows);
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const entities = [...new Set(entries.map((e) => e.entidad))].sort();
  const actions = [...new Set(entries.map((e) => e.accion))].sort();

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={20} className="text-pos-blue" />
          <h2 className="text-lg font-semibold text-pos-text">Bitacora de Actividad</h2>
          <span className="text-sm text-pos-muted">({entries.length} registros)</span>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
            showFilters
              ? "bg-pos-blue text-white"
              : "bg-pos-card border border-slate-700 text-pos-muted hover:text-pos-text"
          }`}
        >
          <Filter size={16} />
          Filtros
        </button>
      </div>

      {showFilters && (
        <div className="bg-pos-card border border-slate-700 rounded-xl p-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-pos-muted mb-1">Accion</label>
              <select
                value={filters.accion}
                onChange={(e) => setFilters({ ...filters, accion: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-blue focus:outline-none"
              >
                <option value="">Todas</option>
                {actions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-pos-muted mb-1">Entidad</label>
              <select
                value={filters.entidad}
                onChange={(e) => setFilters({ ...filters, entidad: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-blue focus:outline-none"
              >
                <option value="">Todas</option>
                {entities.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-pos-muted mb-1">Desde</label>
              <input
                type="date"
                value={filters.desde}
                onChange={(e) => setFilters({ ...filters, desde: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-pos-muted mb-1">Hasta</label>
              <input
                type="date"
                value={filters.hasta}
                onChange={(e) => setFilters({ ...filters, hasta: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-blue focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => setFilters({ accion: "", entidad: "", desde: "", hasta: "" })}
              className="px-3 py-1.5 text-xs text-pos-muted hover:text-pos-text transition-colors cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-pos-muted border-b border-slate-700">
              <th className="pb-2 font-medium w-40">Fecha</th>
              <th className="pb-2 font-medium w-28">Accion</th>
              <th className="pb-2 font-medium w-28">Entidad</th>
              <th className="pb-2 font-medium w-16 text-center">ID</th>
              <th className="pb-2 font-medium">Descripcion</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-slate-800 text-sm hover:bg-pos-active/50 transition-colors"
              >
                <td className="py-2.5 text-pos-muted text-xs font-mono">
                  {new Date(entry.fecha).toLocaleString()}
                </td>
                <td className="py-2.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      ACCION_COLORS[entry.accion] || "bg-slate-700/50 text-pos-muted"
                    }`}
                  >
                    {entry.accion}
                  </span>
                </td>
                <td className="py-2.5 text-pos-text text-xs">{entry.entidad}</td>
                <td className="py-2.5 text-pos-muted text-xs text-center font-mono">
                  {entry.entidadId ?? "-"}
                </td>
                <td className="py-2.5 text-pos-muted text-xs">{entry.descripcion ?? "-"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-pos-muted text-sm">
                  No hay registros en la bitacora
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
