"use client";

import { useState, useEffect } from "react";
import { ContactRound, Plus, Download, X } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Proveedor {
  id: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  rfc: string | null;
  activo: boolean;
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", contacto: "", telefono: "", email: "", rfc: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProveedores();
  }, [page]);

  const loadProveedores = () => {
    setLoading(true);
    api.proveedores
      .list(page, 50)
      .then((res) => setProveedores(res.data || []))
      .catch(() => setProveedores([]))
      .finally(() => setLoading(false));
  };

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    try {
      await api.proveedores.create({
        nombre: form.nombre,
        contacto: form.contacto || undefined,
        telefono: form.telefono || undefined,
        email: form.email || undefined,
        rfc: form.rfc || undefined,
      });
      setShowForm(false);
      setForm({ nombre: "", contacto: "", telefono: "", email: "", rfc: "" });
      loadProveedores();
    } catch (e: any) {
      setError(e.message || "Error al crear proveedor");
    }
    setSaving(false);
  };

  const handleToggle = async (p: Proveedor) => {
    await api.proveedores.update(p.id, { activo: !p.activo });
    setProveedores((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, activo: !x.activo } : x))
    );
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ContactRound size={20} className="text-pos-amber" />
          <h1 className="text-2xl font-bold text-pos-text">Proveedores</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Nuevo Proveedor
          </button>
          {proveedores.length > 0 && (
            <button
              onClick={() =>
                exportToExcel(
                  proveedores.map((p) => ({
                    Nombre: p.nombre,
                    Contacto: p.contacto || "",
                    Telefono: p.telefono || "",
                    Email: p.email || "",
                    RFC: p.rfc || "",
                    Estado: p.activo ? "Activo" : "Inactivo",
                  })),
                  "proveedores"
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
          <div className="bg-pos-card border border-slate-700 rounded-2xl w-[450px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-pos-text font-semibold">Nuevo Proveedor</h2>
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
              <input
                placeholder="Contacto"
                value={form.contacto}
                onChange={(e) => setForm({ ...form, contacto: e.target.value })}
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
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
                />
              </div>
              <input
                placeholder="RFC"
                value={form.rfc}
                onChange={(e) => setForm({ ...form, rfc: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm font-mono placeholder:text-pos-muted/50"
              />
              {error && <p className="text-pos-red text-xs">{error}</p>}
              <button
                onClick={handleCreate}
                disabled={saving || !form.nombre}
                className="w-full py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-pos-green/80 disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Creando..." : "Crear Proveedor"}
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
              <th className="p-3 font-medium">Contacto</th>
              <th className="p-3 font-medium">Telefono</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">RFC</th>
              <th className="p-3 font-medium text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-pos-muted text-sm">Cargando...</td>
              </tr>
            ) : proveedores.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-pos-muted text-sm">No hay proveedores</td>
              </tr>
            ) : (
              proveedores.map((p) => (
                <tr key={p.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-text font-medium">{p.nombre}</td>
                  <td className="p-3 text-pos-muted">{p.contacto || "-"}</td>
                  <td className="p-3 text-pos-muted">{p.telefono || "-"}</td>
                  <td className="p-3 text-pos-muted text-xs">{p.email || "-"}</td>
                  <td className="p-3 text-pos-muted font-mono text-xs">{p.rfc || "-"}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggle(p)}
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                        p.activo ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-pos-muted"
                      }`}
                    >
                      {p.activo ? "Activo" : "Inactivo"}
                    </button>
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
          disabled={proveedores.length < 50}
          className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
