"use client";

import { useState, useEffect } from "react";
import { Package, Download, Search } from "lucide-react";
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
  activo: boolean;
}

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    setLoading(true);
    api.productos
      .list(page, 50, search || undefined)
      .then((res) => setProductos(res.data || res))
      .catch(() => setProductos([]))
      .finally(() => setLoading(false));
  }, [page, search]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-pos-blue" />
          <h1 className="text-2xl font-bold text-pos-text">Inventario</h1>
        </div>
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
            Exportar Excel
          </button>
        )}
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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : productos.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-pos-muted text-sm">No hay productos registrados</td></tr>
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
    </div>
  );
}
