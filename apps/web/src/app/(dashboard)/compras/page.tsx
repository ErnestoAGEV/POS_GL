"use client";

import { useState, useEffect } from "react";
import { Truck, Download, Plus, CheckCircle, XCircle, X } from "lucide-react";
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
  const [provMap, setProvMap] = useState<Record<number, string>>({});
  const [sucMap, setSucMap] = useState<Record<number, string>>({});
  const [provList, setProvList] = useState<{ id: number; nombre: string }[]>([]);
  const [sucList, setSucList] = useState<{ id: number; nombre: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ proveedorId: "", sucursalId: "", total: "", notas: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.proveedores.list(1, 500).then((res) => {
        const list = res.data || res;
        setProvList(list);
        const map: Record<number, string> = {};
        for (const p of list) map[p.id] = p.nombre;
        setProvMap(map);
      }).catch(() => {}),
      api.sucursales.list(1, 500).then((res) => {
        const list = res.data || res;
        setSucList(list);
        const map: Record<number, string> = {};
        for (const s of list) map[s.id] = s.nombre;
        setSucMap(map);
      }).catch(() => {}),
    ]);
  }, []);

  const loadCompras = () => {
    setLoading(true);
    api.compras
      .list(page, 50, filter || undefined)
      .then((res) => setCompras(res.data || []))
      .catch(() => setCompras([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCompras();
  }, [page, filter]);

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    try {
      await api.compras.create({
        proveedorId: parseInt(form.proveedorId),
        sucursalId: parseInt(form.sucursalId),
        total: parseFloat(form.total) || 0,
        notas: form.notas || undefined,
      });
      setShowForm(false);
      setForm({ proveedorId: "", sucursalId: "", total: "", notas: "" });
      loadCompras();
    } catch (e: any) {
      setError(e.message || "Error al crear compra");
    }
    setSaving(false);
  };

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
          <button
            onClick={() => { setForm({ proveedorId: "", sucursalId: "", total: "", notas: "" }); setError(""); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Nueva Compra
          </button>
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
                    Proveedor: provMap[c.proveedorId] || `#${c.proveedorId}`,
                    Sucursal: sucMap[c.sucursalId] || `#${c.sucursalId}`,
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-pos-card border border-slate-700 rounded-2xl w-[450px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-pos-text font-semibold">Nueva Compra</h2>
              <button onClick={() => setShowForm(false)} className="text-pos-muted hover:text-pos-text cursor-pointer"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <select value={form.proveedorId} onChange={(e) => setForm({ ...form, proveedorId: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm cursor-pointer">
                <option value="">Proveedor *</option>
                {provList.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              <select value={form.sucursalId} onChange={(e) => setForm({ ...form, sucursalId: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm cursor-pointer">
                <option value="">Sucursal *</option>
                {sucList.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="Total *" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50" />
              <input placeholder="Notas (opcional)" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50" />
              {error && <p className="text-pos-red text-xs">{error}</p>}
              <button onClick={handleCreate} disabled={saving || !form.proveedorId || !form.sucursalId || !form.total} className="w-full py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-pos-green/80 disabled:opacity-50 cursor-pointer">
                {saving ? "Creando..." : "Crear Compra"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <td className="p-3 text-pos-text">{provMap[c.proveedorId] || `Prov. #${c.proveedorId}`}</td>
                  <td className="p-3 text-pos-muted">{sucMap[c.sucursalId] || `Suc. #${c.sucursalId}`}</td>
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
