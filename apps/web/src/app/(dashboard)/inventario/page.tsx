"use client";

import { useState, useEffect } from "react";
import { Package, Download, Search, Plus, Pencil, Trash2, X, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Producto {
  id: number;
  nombre: string;
  sku: string | null;
  codigoBarras: string | null;
  precioVenta: number;
  costo: number;
  stockMinimo: number;
  categoriaId: number | null;
  claveSat: string | null;
  unidadSat: string | null;
  tasaIva: number;
  activo: boolean;
}

interface ProductForm {
  nombre: string;
  sku: string;
  codigoBarras: string;
  precioVenta: string;
  costo: string;
  stockMinimo: string;
  categoriaId: string;
  claveSat: string;
  unidadSat: string;
  tasaIva: string;
}

const emptyForm: ProductForm = {
  nombre: "",
  sku: "",
  codigoBarras: "",
  precioVenta: "",
  costo: "",
  stockMinimo: "0",
  categoriaId: "",
  claveSat: "",
  unidadSat: "H87",
  tasaIva: "0.16",
};

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null);

  useEffect(() => {
    loadProducts();
  }, [page, search]);

  const loadProducts = () => {
    setLoading(true);
    api.productos
      .list(page, 50, search || undefined)
      .then((res) => setProductos(res.data || res))
      .catch(() => setProductos([]))
      .finally(() => setLoading(false));
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (p: Producto) => {
    setForm({
      nombre: p.nombre,
      sku: p.sku || "",
      codigoBarras: p.codigoBarras || "",
      precioVenta: String(p.precioVenta),
      costo: String(p.costo),
      stockMinimo: String(p.stockMinimo),
      categoriaId: p.categoriaId ? String(p.categoriaId) : "",
      claveSat: p.claveSat || "",
      unidadSat: p.unidadSat || "H87",
      tasaIva: String(p.tasaIva),
    });
    setEditingId(p.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.precioVenta) return;
    setSaving(true);
    try {
      const data = {
        nombre: form.nombre,
        sku: form.sku || undefined,
        codigoBarras: form.codigoBarras || undefined,
        precioVenta: parseFloat(form.precioVenta),
        costo: form.costo ? parseFloat(form.costo) : 0,
        stockMinimo: parseInt(form.stockMinimo) || 0,
        categoriaId: form.categoriaId ? parseInt(form.categoriaId) : undefined,
        claveSat: form.claveSat || undefined,
        unidadSat: form.unidadSat || undefined,
        tasaIva: form.tasaIva ? parseFloat(form.tasaIva) : 0.16,
      };
      if (editingId) {
        await api.productos.update(editingId, data);
      } else {
        await api.productos.create(data);
      }
      setShowModal(false);
      loadProducts();
    } catch {
      // error handled by api client
    } finally {
      setSaving(false);
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) throw new Error("CSV vacio");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const items = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim());
        const row: any = {};
        headers.forEach((h, i) => {
          if (cols[i]) row[h] = cols[i];
        });
        return {
          nombre: row.nombre || row.name || "",
          sku: row.sku || undefined,
          codigoBarras: row.codigobarras || row.barcode || undefined,
          precioVenta: parseFloat(row.precioventa || row.precio || "0"),
          costo: row.costo ? parseFloat(row.costo) : undefined,
          stockMinimo: row.stockminimo ? parseInt(row.stockminimo) : undefined,
        };
      }).filter((i) => i.nombre && i.precioVenta > 0);

      const result = await api.productos.bulkImport(items);
      setImportResult(result);
      loadProducts();
    } catch (err: any) {
      setImportResult({ created: 0, errors: [err.message || "Error al importar"] });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Desactivar producto "${nombre}"?`)) return;
    try {
      await api.productos.delete(id);
      loadProducts();
    } catch {
      // error handled by api client
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-pos-blue" />
          <h1 className="text-2xl font-bold text-pos-text">Inventario</h1>
        </div>
        <div className="flex items-center gap-2">
          <label className={`flex items-center gap-2 px-4 py-2 bg-pos-amber/20 text-pos-amber rounded-lg text-sm hover:bg-pos-amber/30 transition-colors cursor-pointer ${importing ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload size={16} />
            {importing ? "Importando..." : "Importar CSV"}
            <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
          </label>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Nuevo Producto
          </button>
          {productos.length > 0 && (
            <button
              onClick={() =>
                exportToExcel(
                  productos.map((p) => ({
                    Nombre: p.nombre,
                    SKU: p.sku || "",
                    "Codigo Barras": p.codigoBarras || "",
                    Costo: p.costo,
                    "Precio Venta": p.precioVenta,
                    "Stock Minimo": p.stockMinimo,
                    Estado: p.activo ? "Activo" : "Inactivo",
                  })),
                  "inventario"
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

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted" />
          <input
            placeholder="Buscar por nombre, SKU o codigo de barras..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full bg-pos-card border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 transition-colors cursor-pointer">Buscar</button>
        {search && (
          <button onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }} className="px-3 py-2 text-pos-muted text-sm hover:text-pos-text cursor-pointer">Limpiar</button>
        )}
      </div>

      {importResult && (
        <div className={`rounded-lg p-3 text-sm ${importResult.created > 0 ? "bg-green-500/10 border border-green-700/50" : "bg-red-500/10 border border-red-700/50"}`}>
          <div className="flex items-center justify-between">
            <span className={importResult.created > 0 ? "text-green-400" : "text-red-400"}>
              {importResult.created > 0 ? `${importResult.created} productos importados` : "Error en importacion"}
              {importResult.errors.length > 0 && ` (${importResult.errors.length} errores)`}
            </span>
            <button onClick={() => setImportResult(null)} className="text-pos-muted hover:text-pos-text cursor-pointer"><X size={14} /></button>
          </div>
          {importResult.errors.length > 0 && (
            <ul className="mt-1 text-xs text-pos-muted space-y-0.5">
              {importResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              {importResult.errors.length > 5 && <li>...y {importResult.errors.length - 5} errores mas</li>}
            </ul>
          )}
        </div>
      )}

      <div className="bg-pos-card border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-pos-muted border-b border-slate-700">
              <th className="p-3 font-medium">Producto</th>
              <th className="p-3 font-medium">SKU</th>
              <th className="p-3 font-medium">Codigo Barras</th>
              <th className="p-3 font-medium text-right">Costo</th>
              <th className="p-3 font-medium text-right">Precio Venta</th>
              <th className="p-3 font-medium text-right">Margen</th>
              <th className="p-3 font-medium text-right">Stock Min.</th>
              <th className="p-3 font-medium text-center">Estado</th>
              <th className="p-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : productos.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-pos-muted text-sm">No hay productos registrados</td></tr>
            ) : (
              productos.map((p) => {
                const margen = p.precioVenta > 0 && p.costo > 0
                  ? (((p.precioVenta - p.costo) / p.precioVenta) * 100).toFixed(1)
                  : "-";
                return (
                  <tr key={p.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                    <td className="p-3 text-pos-text font-medium">{p.nombre}</td>
                    <td className="p-3 text-pos-muted font-mono text-xs">{p.sku || "-"}</td>
                    <td className="p-3 text-pos-muted font-mono text-xs">{p.codigoBarras || "-"}</td>
                    <td className="p-3 text-pos-muted text-right font-mono">${p.costo.toFixed(2)}</td>
                    <td className="p-3 text-pos-green text-right font-mono">${p.precioVenta.toFixed(2)}</td>
                    <td className="p-3 text-pos-blue text-right font-mono">{margen !== "-" ? `${margen}%` : "-"}</td>
                    <td className="p-3 text-right">{p.stockMinimo > 0 && <span className="text-pos-amber font-mono text-xs">{p.stockMinimo}</span>}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${p.activo ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-pos-muted"}`}>{p.activo ? "Activo" : "Inactivo"}</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-pos-muted hover:text-pos-blue transition-colors cursor-pointer" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(p.id, p.nombre)} className="p-1.5 text-pos-muted hover:text-pos-red transition-colors cursor-pointer" title="Desactivar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer">Anterior</button>
        <span className="px-4 py-2 text-sm text-pos-muted">Pagina {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={productos.length < 50} className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer">Siguiente</button>
      </div>

      {/* Modal crear/editar producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-pos-card border border-slate-700 rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-pos-text">
                {editingId ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-pos-muted hover:text-pos-text cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-pos-muted">Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-pos-muted">SKU</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-pos-muted">Codigo de Barras</label>
                <input value={form.codigoBarras} onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-pos-muted">Precio Venta *</label>
                <input type="number" step="0.01" value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-pos-muted">Costo</label>
                <input type="number" step="0.01" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-pos-muted">Stock Minimo</label>
                <input type="number" value={form.stockMinimo} onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-pos-muted">Tasa IVA</label>
                <input type="number" step="0.01" value={form.tasaIva} onChange={(e) => setForm({ ...form, tasaIva: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-pos-muted">Clave SAT</label>
                <input value={form.claveSat} onChange={(e) => setForm({ ...form, claveSat: e.target.value })} placeholder="01010101" className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1 placeholder:text-pos-muted/40" />
              </div>
              <div>
                <label className="text-xs text-pos-muted">Unidad SAT</label>
                <input value={form.unidadSat} onChange={(e) => setForm({ ...form, unidadSat: e.target.value })} placeholder="H87" className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1 placeholder:text-pos-muted/40" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-pos-muted hover:text-pos-text cursor-pointer">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.nombre || !form.precioVenta} className="px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 disabled:opacity-50 transition-colors cursor-pointer">
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
