import { useState, useEffect, useCallback } from "react";
import { Tags, Plus, ToggleLeft, ToggleRight } from "lucide-react";

interface Promo {
  id: number;
  nombre: string;
  tipo: string;
  valor: number;
  precioObjetivo: number | null;
  productoId: number | null;
  categoriaId: number | null;
  fechaInicio: string;
  fechaFin: string;
  activa: number;
}

const TIPO_LABELS: Record<string, string> = {
  "2x1": "2x1",
  nxprecio: "N x Precio",
  porcentaje: "% Descuento",
  monto_fijo: "Monto Fijo",
};

export function PromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    tipo: "porcentaje" as string,
    valor: "",
    precioObjetivo: "",
    fechaInicio: "",
    fechaFin: "",
  });

  const load = useCallback(async () => {
    const rows = await window.api.promos.list();
    setPromos(rows);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.nombre || !form.valor || !form.fechaInicio || !form.fechaFin) return;
    await window.api.promos.create({
      nombre: form.nombre,
      tipo: form.tipo,
      valor: parseFloat(form.valor),
      precioObjetivo: form.precioObjetivo ? parseFloat(form.precioObjetivo) : undefined,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
    });
    setForm({ nombre: "", tipo: "porcentaje", valor: "", precioObjetivo: "", fechaInicio: "", fechaFin: "" });
    setShowForm(false);
    load();
  };

  const handleToggle = async (id: number, activa: number) => {
    await window.api.promos.toggle(id, activa ? 0 : 1);
    load();
  };

  const isActive = (p: Promo) => {
    if (!p.activa) return false;
    const now = new Date();
    return new Date(p.fechaInicio) <= now && new Date(p.fechaFin) >= now;
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tags size={20} className="text-pos-amber" />
          <h2 className="text-lg font-semibold text-pos-text">Promociones</h2>
          <span className="text-sm text-pos-muted">({promos.length})</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          Nueva Promo
        </button>
      </div>

      {showForm && (
        <div className="bg-pos-card border border-slate-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-pos-muted mb-1">Nombre</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-green focus:outline-none"
                placeholder="Ej: Descuento Verano"
              />
            </div>
            <div>
              <label className="block text-xs text-pos-muted mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-green focus:outline-none"
              >
                <option value="porcentaje">% Descuento</option>
                <option value="monto_fijo">Monto Fijo</option>
                <option value="2x1">2x1</option>
                <option value="nxprecio">N x Precio</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-pos-muted mb-1">Valor</label>
              <input
                type="number"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-green focus:outline-none"
                placeholder={form.tipo === "porcentaje" ? "Ej: 15" : "Ej: 50.00"}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-pos-muted mb-1">Precio Objetivo (opc.)</label>
              <input
                type="number"
                value={form.precioObjetivo}
                onChange={(e) => setForm({ ...form, precioObjetivo: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-green focus:outline-none"
                placeholder="Ej: 99.00"
              />
            </div>
            <div>
              <label className="block text-xs text-pos-muted mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={form.fechaInicio}
                onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-green focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-pos-muted mb-1">Fecha Fin</label>
              <input
                type="date"
                value={form.fechaFin}
                onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-green focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-pos-muted hover:text-pos-text transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors cursor-pointer"
            >
              Crear Promocion
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-pos-muted border-b border-slate-700">
              <th className="pb-2 font-medium">Nombre</th>
              <th className="pb-2 font-medium">Tipo</th>
              <th className="pb-2 font-medium text-right">Valor</th>
              <th className="pb-2 font-medium">Inicio</th>
              <th className="pb-2 font-medium">Fin</th>
              <th className="pb-2 font-medium text-center">Estado</th>
              <th className="pb-2 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {promos.map((p) => {
              const active = isActive(p);
              return (
                <tr
                  key={p.id}
                  className="border-b border-slate-800 text-sm hover:bg-pos-active/50 transition-colors"
                >
                  <td className="py-3 text-pos-text font-medium">{p.nombre}</td>
                  <td className="py-3 text-pos-muted">{TIPO_LABELS[p.tipo] || p.tipo}</td>
                  <td className="py-3 text-pos-text text-right font-mono">
                    {p.tipo === "porcentaje" ? `${p.valor}%` : `$${p.valor.toFixed(2)}`}
                  </td>
                  <td className="py-3 text-pos-muted">{new Date(p.fechaInicio).toLocaleDateString()}</td>
                  <td className="py-3 text-pos-muted">{new Date(p.fechaFin).toLocaleDateString()}</td>
                  <td className="py-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        active
                          ? "bg-green-500/20 text-pos-green"
                          : "bg-slate-700/50 text-pos-muted"
                      }`}
                    >
                      {active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <button
                      onClick={() => handleToggle(p.id, p.activa)}
                      className="p-1.5 rounded-lg hover:bg-pos-active transition-colors cursor-pointer"
                      title={p.activa ? "Desactivar" : "Activar"}
                    >
                      {p.activa ? (
                        <ToggleRight size={18} className="text-pos-green" />
                      ) : (
                        <ToggleLeft size={18} className="text-pos-muted" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
            {promos.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-pos-muted text-sm">
                  No hay promociones registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
