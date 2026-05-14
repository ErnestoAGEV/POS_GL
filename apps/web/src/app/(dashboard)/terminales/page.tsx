"use client";

import { useState, useEffect } from "react";
import { Monitor, Plus, Download, X, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Terminal {
  id: number;
  nombre: string;
  sucursalId: number;
  activa: boolean;
}

interface Sucursal {
  id: number;
  nombre: string;
  activa: boolean;
}

export default function TerminalesPage() {
  const [terminales, setTerminales] = useState<Terminal[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", sucursalId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadTerminales();
  }, [page]);

  useEffect(() => {
    api.sucursales.list(1, 500).then((res) => setSucursales(res.data || [])).catch(() => {});
  }, []);

  const loadTerminales = () => {
    setLoading(true);
    api.terminales
      .list(page, 50)
      .then((res) => setTerminales(res.data || []))
      .catch(() => setTerminales([]))
      .finally(() => setLoading(false));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const data = {
        nombre: form.nombre,
        sucursalId: parseInt(form.sucursalId),
      };
      if (editingId) {
        await api.terminales.update(editingId, data);
      } else {
        await api.terminales.create(data);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ nombre: "", sucursalId: "" });
      loadTerminales();
    } catch (e: any) {
      setError(e.message || (editingId ? "Error al actualizar" : "Error al crear terminal"));
    }
    setSaving(false);
  };

  const handleEdit = (t: Terminal) => {
    setForm({
      nombre: t.nombre,
      sucursalId: String(t.sucursalId),
    });
    setEditingId(t.id);
    setError("");
    setShowForm(true);
  };

  const handleToggle = async (t: Terminal) => {
    await api.terminales.update(t.id, { activa: !t.activa });
    setTerminales((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, activa: !x.activa } : x))
    );
  };

  const sucursalName = (id: number) =>
    sucursales.find((s) => s.id === id)?.nombre || `#${id}`;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor size={20} className="text-pos-blue" />
          <h1 className="text-2xl font-bold text-pos-text">Terminales</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditingId(null); setForm({ nombre: "", sucursalId: "" }); setError(""); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Nueva Terminal
          </button>
          {terminales.length > 0 && (
            <button
              onClick={() =>
                exportToExcel(
                  terminales.map((t) => ({
                    Nombre: t.nombre,
                    Sucursal: sucursalName(t.sucursalId),
                    Estado: t.activa ? "Activa" : "Inactiva",
                  })),
                  "terminales"
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
          <div className="bg-pos-card border border-slate-700 rounded-2xl w-[400px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-pos-text font-semibold">{editingId ? "Editar Terminal" : "Nueva Terminal"}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-pos-muted hover:text-pos-text cursor-pointer">
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
              <select
                value={form.sucursalId}
                onChange={(e) => setForm({ ...form, sucursalId: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm cursor-pointer"
              >
                <option value="">Seleccionar sucursal *</option>
                {sucursales.filter((s) => s.activa).map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
              {error && <p className="text-pos-red text-xs">{error}</p>}
              <button
                onClick={handleSave}
                disabled={saving || !form.nombre || !form.sucursalId}
                className="w-full py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-pos-green/80 disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear Terminal"}
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
              <th className="p-3 font-medium">Sucursal</th>
              <th className="p-3 font-medium text-center">Estado</th>
              <th className="p-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : terminales.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-pos-muted text-sm">No hay terminales</td></tr>
            ) : (
              terminales.map((t) => (
                <tr key={t.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-text font-medium">{t.nombre}</td>
                  <td className="p-3 text-pos-muted">{sucursalName(t.sucursalId)}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggle(t)}
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                        t.activa ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-pos-muted"
                      }`}
                    >
                      {t.activa ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleEdit(t)} className="p-1.5 rounded-lg bg-pos-blue/20 text-pos-blue hover:bg-pos-blue/30 cursor-pointer" title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={async () => { if (confirm("Eliminar terminal?")) { await api.terminales.delete(t.id); loadTerminales(); } }} className="p-1.5 rounded-lg bg-pos-red/20 text-pos-red hover:bg-pos-red/30 cursor-pointer" title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer">Anterior</button>
        <span className="px-4 py-2 text-sm text-pos-muted">Pagina {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={terminales.length < 50} className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer">Siguiente</button>
      </div>
    </div>
  );
}
