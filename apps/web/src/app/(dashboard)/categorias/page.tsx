"use client";

import { useState, useEffect } from "react";
import { FolderTree, Plus, Download, X } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Categoria {
  id: number;
  nombre: string;
  categoriaPadreId: number | null;
  activa: boolean;
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [allCategorias, setAllCategorias] = useState<Categoria[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", categoriaPadreId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCategorias();
  }, [page]);

  useEffect(() => {
    api.categorias.list(1, 500).then((res) => setAllCategorias(res.data || [])).catch(() => {});
  }, []);

  const loadCategorias = () => {
    setLoading(true);
    api.categorias
      .list(page, 50)
      .then((res) => setCategorias(res.data || []))
      .catch(() => setCategorias([]))
      .finally(() => setLoading(false));
  };

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    try {
      await api.categorias.create({
        nombre: form.nombre,
        categoriaPadreId: form.categoriaPadreId ? parseInt(form.categoriaPadreId) : undefined,
      });
      setShowForm(false);
      setForm({ nombre: "", categoriaPadreId: "" });
      loadCategorias();
      api.categorias.list(1, 500).then((res) => setAllCategorias(res.data || []));
    } catch (e: any) {
      setError(e.message || "Error al crear categoria");
    }
    setSaving(false);
  };

  const handleToggle = async (c: Categoria) => {
    await api.categorias.update(c.id, { activa: !c.activa });
    setCategorias((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, activa: !x.activa } : x))
    );
  };

  const parentName = (id: number | null) => {
    if (!id) return "-";
    return allCategorias.find((c) => c.id === id)?.nombre || `#${id}`;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTree size={20} className="text-pos-amber" />
          <h1 className="text-2xl font-bold text-pos-text">Categorias</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Nueva Categoria
          </button>
          {categorias.length > 0 && (
            <button
              onClick={() =>
                exportToExcel(
                  categorias.map((c) => ({
                    Nombre: c.nombre,
                    "Categoria Padre": parentName(c.categoriaPadreId),
                    Estado: c.activa ? "Activa" : "Inactiva",
                  })),
                  "categorias"
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
              <h2 className="text-pos-text font-semibold">Nueva Categoria</h2>
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
              <select
                value={form.categoriaPadreId}
                onChange={(e) => setForm({ ...form, categoriaPadreId: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm cursor-pointer"
              >
                <option value="">Sin categoria padre</option>
                {allCategorias.filter((c) => c.activa).map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              {error && <p className="text-pos-red text-xs">{error}</p>}
              <button
                onClick={handleCreate}
                disabled={saving || !form.nombre}
                className="w-full py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-pos-green/80 disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Creando..." : "Crear Categoria"}
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
              <th className="p-3 font-medium">Categoria Padre</th>
              <th className="p-3 font-medium text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : categorias.length === 0 ? (
              <tr><td colSpan={3} className="p-8 text-center text-pos-muted text-sm">No hay categorias</td></tr>
            ) : (
              categorias.map((c) => (
                <tr key={c.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-text font-medium">{c.nombre}</td>
                  <td className="p-3 text-pos-muted">{parentName(c.categoriaPadreId)}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggle(c)}
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                        c.activa ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-pos-muted"
                      }`}
                    >
                      {c.activa ? "Activa" : "Inactiva"}
                    </button>
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
        <button onClick={() => setPage((p) => p + 1)} disabled={categorias.length < 50} className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer">Siguiente</button>
      </div>
    </div>
  );
}
