"use client";

import { useState, useEffect } from "react";
import { Building2, Plus, Download, X, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Sucursal {
  id: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  rfc: string | null;
  razonSocial: string | null;
  regimenFiscal: string | null;
  codigoPostal: string | null;
  activa: boolean;
}

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nombre: "", direccion: "", telefono: "", rfc: "",
    razonSocial: "", regimenFiscal: "", codigoPostal: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadSucursales();
  }, [page]);

  const loadSucursales = () => {
    setLoading(true);
    api.sucursales
      .list(page, 50)
      .then((res) => setSucursales(res.data || []))
      .catch(() => setSucursales([]))
      .finally(() => setLoading(false));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const data = {
        nombre: form.nombre,
        direccion: form.direccion || undefined,
        telefono: form.telefono || undefined,
        rfc: form.rfc || undefined,
        razonSocial: form.razonSocial || undefined,
        regimenFiscal: form.regimenFiscal || undefined,
        codigoPostal: form.codigoPostal || undefined,
      };
      if (editingId) {
        await api.sucursales.update(editingId, data);
      } else {
        await api.sucursales.create(data);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ nombre: "", direccion: "", telefono: "", rfc: "", razonSocial: "", regimenFiscal: "", codigoPostal: "" });
      loadSucursales();
    } catch (e: any) {
      setError(e.message || (editingId ? "Error al actualizar" : "Error al crear sucursal"));
    }
    setSaving(false);
  };

  const handleEdit = (s: Sucursal) => {
    setForm({
      nombre: s.nombre,
      direccion: s.direccion || "",
      telefono: s.telefono || "",
      rfc: s.rfc || "",
      razonSocial: s.razonSocial || "",
      regimenFiscal: s.regimenFiscal || "",
      codigoPostal: s.codigoPostal || "",
    });
    setEditingId(s.id);
    setError("");
    setShowForm(true);
  };

  const handleToggle = async (s: Sucursal) => {
    await api.sucursales.update(s.id, { activa: !s.activa });
    setSucursales((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, activa: !x.activa } : x))
    );
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-purple-400" />
          <h1 className="text-2xl font-bold text-pos-text">Sucursales</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditingId(null); setForm({ nombre: "", direccion: "", telefono: "", rfc: "", razonSocial: "", regimenFiscal: "", codigoPostal: "" }); setError(""); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Nueva Sucursal
          </button>
          {sucursales.length > 0 && (
            <button
              onClick={() =>
                exportToExcel(
                  sucursales.map((s) => ({
                    Nombre: s.nombre,
                    Direccion: s.direccion || "",
                    Telefono: s.telefono || "",
                    RFC: s.rfc || "",
                    "Razon Social": s.razonSocial || "",
                    "Regimen Fiscal": s.regimenFiscal || "",
                    "Codigo Postal": s.codigoPostal || "",
                    Estado: s.activa ? "Activa" : "Inactiva",
                  })),
                  "sucursales"
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
              <h2 className="text-pos-text font-semibold">{editingId ? "Editar Sucursal" : "Nueva Sucursal"}</h2>
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
              <input
                placeholder="Direccion"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Telefono"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
                />
                <input
                  placeholder="RFC"
                  value={form.rfc}
                  onChange={(e) => setForm({ ...form, rfc: e.target.value })}
                  className="bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm font-mono placeholder:text-pos-muted/50"
                />
              </div>
              <input
                placeholder="Razon Social"
                value={form.razonSocial}
                onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Regimen Fiscal"
                  value={form.regimenFiscal}
                  onChange={(e) => setForm({ ...form, regimenFiscal: e.target.value })}
                  className="bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
                />
                <input
                  placeholder="Codigo Postal"
                  value={form.codigoPostal}
                  onChange={(e) => setForm({ ...form, codigoPostal: e.target.value })}
                  className="bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
                />
              </div>
              {error && <p className="text-pos-red text-xs">{error}</p>}
              <button
                onClick={handleSave}
                disabled={saving || !form.nombre}
                className="w-full py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-pos-green/80 disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear Sucursal"}
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
              <th className="p-3 font-medium">Direccion</th>
              <th className="p-3 font-medium">Telefono</th>
              <th className="p-3 font-medium">RFC</th>
              <th className="p-3 font-medium">Razon Social</th>
              <th className="p-3 font-medium text-center">Estado</th>
              <th className="p-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-pos-muted text-sm">Cargando...</td>
              </tr>
            ) : sucursales.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-pos-muted text-sm">No hay sucursales</td>
              </tr>
            ) : (
              sucursales.map((s) => (
                <tr key={s.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-text font-medium">{s.nombre}</td>
                  <td className="p-3 text-pos-muted text-xs max-w-[200px] truncate">{s.direccion || "-"}</td>
                  <td className="p-3 text-pos-muted">{s.telefono || "-"}</td>
                  <td className="p-3 text-pos-muted font-mono text-xs">{s.rfc || "-"}</td>
                  <td className="p-3 text-pos-muted text-xs">{s.razonSocial || "-"}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggle(s)}
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                        s.activa ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-pos-muted"
                      }`}
                    >
                      {s.activa ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleEdit(s)} className="p-1.5 rounded-lg bg-pos-blue/20 text-pos-blue hover:bg-pos-blue/30 cursor-pointer" title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={async () => { if (confirm("Eliminar sucursal?")) { await api.sucursales.delete(s.id); loadSucursales(); } }} className="p-1.5 rounded-lg bg-pos-red/20 text-pos-red hover:bg-pos-red/30 cursor-pointer" title="Eliminar">
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
          disabled={sucursales.length < 50}
          className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
