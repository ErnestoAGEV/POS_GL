"use client";

import { useState, useEffect } from "react";
import { Tags, Plus, Download, X } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Promocion {
  id: number;
  nombre: string;
  tipo: string;
  valor: number;
  precioObjetivo: number | null;
  productoId: number | null;
  categoriaId: number | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  activa: boolean;
}

const TIPO_LABELS: Record<string, string> = {
  "2x1": "2x1",
  nxprecio: "N x Precio",
  porcentaje: "Porcentaje",
  monto_fijo: "Monto Fijo",
};

export default function PromocionesPage() {
  const [promos, setPromos] = useState<Promocion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    tipo: "porcentaje",
    valor: "",
    precioObjetivo: "",
    productoId: "",
    categoriaId: "",
    fechaInicio: "",
    fechaFin: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPromos();
  }, []);

  const loadPromos = () => {
    setLoading(true);
    api.promociones
      .list()
      .then((data) => setPromos(Array.isArray(data) ? data : []))
      .catch(() => setPromos([]))
      .finally(() => setLoading(false));
  };

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    try {
      await api.promociones.create({
        nombre: form.nombre,
        tipo: form.tipo,
        valor: parseFloat(form.valor) || 0,
        precioObjetivo: form.precioObjetivo ? parseFloat(form.precioObjetivo) : undefined,
        productoId: form.productoId ? parseInt(form.productoId) : undefined,
        categoriaId: form.categoriaId ? parseInt(form.categoriaId) : undefined,
        fechaInicio: form.fechaInicio || undefined,
        fechaFin: form.fechaFin || undefined,
      });
      setShowForm(false);
      setForm({ nombre: "", tipo: "porcentaje", valor: "", precioObjetivo: "", productoId: "", categoriaId: "", fechaInicio: "", fechaFin: "" });
      loadPromos();
    } catch (e: any) {
      setError(e.message || "Error al crear promocion");
    }
    setSaving(false);
  };

  const handleToggle = async (p: Promocion) => {
    await api.promociones.update(p.id, { activa: !p.activa });
    setPromos((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, activa: !x.activa } : x))
    );
  };

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("es-MX") : "-";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tags size={20} className="text-pos-purple" />
          <h1 className="text-2xl font-bold text-pos-text">Promociones</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Nueva Promocion
          </button>
          {promos.length > 0 && (
            <button
              onClick={() =>
                exportToExcel(
                  promos.map((p) => ({
                    Nombre: p.nombre,
                    Tipo: TIPO_LABELS[p.tipo] || p.tipo,
                    Valor: p.valor,
                    "Precio Objetivo": p.precioObjetivo ?? "",
                    "Producto ID": p.productoId ?? "",
                    "Categoria ID": p.categoriaId ?? "",
                    "Fecha Inicio": fmtDate(p.fechaInicio),
                    "Fecha Fin": fmtDate(p.fechaFin),
                    Estado: p.activa ? "Activa" : "Inactiva",
                  })),
                  "promociones"
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-pos-card border border-slate-700 rounded-2xl w-[500px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-pos-text font-semibold">Nueva Promocion</h2>
              <button onClick={() => setShowForm(false)} className="text-pos-muted hover:text-pos-text cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                placeholder="Nombre *"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm cursor-pointer"
                >
                  <option value="porcentaje">Porcentaje</option>
                  <option value="monto_fijo">Monto Fijo</option>
                  <option value="2x1">2x1</option>
                  <option value="nxprecio">N x Precio</option>
                </select>
                <input
                  placeholder={form.tipo === "porcentaje" ? "Ej: 15" : "Ej: 50.00"}
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  type="number"
                  step="0.01"
                  className="bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
                />
              </div>
              {form.tipo === "nxprecio" && (
                <input
                  placeholder="Precio objetivo (Ej: 99.00)"
                  value={form.precioObjetivo}
                  onChange={(e) => setForm({ ...form, precioObjetivo: e.target.value })}
                  type="number"
                  step="0.01"
                  className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Producto ID (opcional)"
                  value={form.productoId}
                  onChange={(e) => setForm({ ...form, productoId: e.target.value })}
                  type="number"
                  className="bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
                />
                <input
                  placeholder="Categoria ID (opcional)"
                  value={form.categoriaId}
                  onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                  type="number"
                  className="bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-pos-muted text-xs mb-1 block">Fecha inicio</label>
                  <input
                    type="date"
                    value={form.fechaInicio}
                    onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                    className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm"
                  />
                </div>
                <div>
                  <label className="text-pos-muted text-xs mb-1 block">Fecha fin</label>
                  <input
                    type="date"
                    value={form.fechaFin}
                    onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                    className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm"
                  />
                </div>
              </div>
              {error && <p className="text-pos-red text-xs">{error}</p>}
              <button
                onClick={handleCreate}
                disabled={saving || !form.nombre || !form.valor}
                className="w-full py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-pos-green/80 disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Creando..." : "Crear Promocion"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-pos-card border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-pos-muted border-b border-slate-700">
              <th className="p-3 font-medium">Nombre</th>
              <th className="p-3 font-medium">Tipo</th>
              <th className="p-3 font-medium text-right">Valor</th>
              <th className="p-3 font-medium text-right">Precio Obj.</th>
              <th className="p-3 font-medium">Inicio</th>
              <th className="p-3 font-medium">Fin</th>
              <th className="p-3 font-medium text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : promos.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-pos-muted text-sm">No hay promociones</td></tr>
            ) : (
              promos.map((p) => (
                <tr key={p.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-text font-medium">{p.nombre}</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-pos-blue/20 text-pos-blue rounded text-xs">{TIPO_LABELS[p.tipo] || p.tipo}</span></td>
                  <td className="p-3 text-pos-text text-right font-mono">{p.tipo === "porcentaje" ? `${p.valor}%` : `$${p.valor.toFixed(2)}`}</td>
                  <td className="p-3 text-pos-muted text-right font-mono">{p.precioObjetivo ? `$${p.precioObjetivo.toFixed(2)}` : "-"}</td>
                  <td className="p-3 text-pos-muted text-xs">{fmtDate(p.fechaInicio)}</td>
                  <td className="p-3 text-pos-muted text-xs">{fmtDate(p.fechaFin)}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggle(p)}
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                        p.activa ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-pos-muted"
                      }`}
                    >
                      {p.activa ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
