"use client";

import { useState, useEffect } from "react";
import { Warehouse, Download, AlertTriangle, Pencil, X } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface StockItem {
  productoId: number;
  productoNombre: string;
  sku: string | null;
  codigoBarras: string | null;
  cantidad: number;
  stockMinimo: number;
  precioVenta: number;
  costo: number;
}

interface Sucursal {
  id: number;
  nombre: string;
}

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedSuc, setSelectedSuc] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [adjusting, setAdjusting] = useState<StockItem | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustMotivo, setAdjustMotivo] = useState("");

  useEffect(() => {
    api.sucursales
      .list()
      .then((res) => {
        const list = res.data || res;
        setSucursales(list);
        if (list.length > 0 && selectedSuc === 0) {
          setSelectedSuc(list[0].id);
        }
      })
      .catch(() => setSucursales([]));
  }, []);

  useEffect(() => {
    if (selectedSuc === 0) return;
    setLoading(true);

    const fetcher = showAlertsOnly
      ? api.stock.alerts(selectedSuc)
      : api.stock.bySucursal(selectedSuc);

    fetcher
      .then((res) => setStock(res.data || []))
      .catch(() => setStock([]))
      .finally(() => setLoading(false));
  }, [selectedSuc, showAlertsOnly]);

  const handleAdjust = async () => {
    if (!adjusting || !adjustQty) return;
    try {
      await api.stock.adjust({
        productoId: adjusting.productoId,
        sucursalId: selectedSuc,
        cantidad: parseFloat(adjustQty),
        motivo: adjustMotivo || "Ajuste manual desde dashboard",
      });
      setAdjusting(null);
      setAdjustQty("");
      setAdjustMotivo("");
      // Reload stock
      const res = showAlertsOnly
        ? await api.stock.alerts(selectedSuc)
        : await api.stock.bySucursal(selectedSuc);
      setStock(res.data || []);
    } catch {
      // handled by api client
    }
  };

  const totalValor = stock.reduce((s, i) => s + i.cantidad * i.costo, 0);
  const totalVenta = stock.reduce((s, i) => s + i.cantidad * i.precioVenta, 0);
  const alertCount = stock.filter((i) => i.cantidad <= i.stockMinimo).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Warehouse size={20} className="text-pos-amber" />
          <h1 className="text-2xl font-bold text-pos-text">Stock por Sucursal</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedSuc}
            onChange={(e) => setSelectedSuc(Number(e.target.value))}
            className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text cursor-pointer"
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAlertsOnly(!showAlertsOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
              showAlertsOnly
                ? "bg-pos-red/20 text-pos-red"
                : "bg-pos-card border border-slate-700 text-pos-muted hover:text-pos-text"
            }`}
          >
            <AlertTriangle size={14} />
            {showAlertsOnly ? "Alertas" : "Alertas"}
          </button>
          {stock.length > 0 && (
            <button
              onClick={() =>
                exportToExcel(
                  stock.map((i) => ({
                    Producto: i.productoNombre,
                    SKU: i.sku || "",
                    "Codigo Barras": i.codigoBarras || "",
                    Cantidad: i.cantidad,
                    "Stock Minimo": i.stockMinimo,
                    Costo: i.costo,
                    "Precio Venta": i.precioVenta,
                    "Valor Inventario": i.cantidad * i.costo,
                  })),
                  `stock-sucursal-${selectedSuc}`
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

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-pos-card border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-pos-muted">Productos</p>
          <p className="text-2xl font-bold text-pos-text font-mono">{stock.length}</p>
        </div>
        <div className="bg-pos-card border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-pos-muted">Valor al Costo</p>
          <p className="text-2xl font-bold text-pos-text font-mono">${totalValor.toFixed(2)}</p>
        </div>
        <div className="bg-pos-card border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-pos-muted">Valor en Venta</p>
          <p className="text-2xl font-bold text-pos-green font-mono">${totalVenta.toFixed(2)}</p>
        </div>
        <div className="bg-pos-card border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-pos-muted">Alertas Stock Bajo</p>
          <p className={`text-2xl font-bold font-mono ${alertCount > 0 ? "text-pos-red" : "text-pos-text"}`}>
            {alertCount}
          </p>
        </div>
      </div>

      <div className="bg-pos-card border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-pos-muted border-b border-slate-700">
              <th className="p-3 font-medium">Producto</th>
              <th className="p-3 font-medium">SKU</th>
              <th className="p-3 font-medium text-right">Cantidad</th>
              <th className="p-3 font-medium text-right">Stock Min.</th>
              <th className="p-3 font-medium text-right">Costo</th>
              <th className="p-3 font-medium text-right">Precio</th>
              <th className="p-3 font-medium text-right">Valor Inv.</th>
              <th className="p-3 font-medium text-center">Estado</th>
              <th className="p-3 font-medium text-center">Ajustar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-pos-muted text-sm">Cargando...</td>
              </tr>
            ) : stock.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-pos-muted text-sm">
                  {showAlertsOnly ? "Sin alertas de stock" : "Sin stock registrado"}
                </td>
              </tr>
            ) : (
              stock.map((i) => {
                const isLow = i.cantidad <= i.stockMinimo;
                return (
                  <tr key={i.productoId} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                    <td className="p-3 text-pos-text font-medium">{i.productoNombre}</td>
                    <td className="p-3 text-pos-muted font-mono text-xs">{i.sku || "-"}</td>
                    <td className={`p-3 text-right font-mono font-semibold ${isLow ? "text-pos-red" : "text-pos-text"}`}>
                      {i.cantidad}
                    </td>
                    <td className="p-3 text-right font-mono text-pos-muted">{i.stockMinimo}</td>
                    <td className="p-3 text-right font-mono text-pos-muted">${i.costo.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono text-pos-green">${i.precioVenta.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono text-pos-text">${(i.cantidad * i.costo).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                          <AlertTriangle size={10} />
                          Bajo
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => { setAdjusting(i); setAdjustQty(String(i.cantidad)); setAdjustMotivo(""); }}
                        className="p-1.5 text-pos-muted hover:text-pos-blue transition-colors cursor-pointer"
                        title="Ajustar stock"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Adjust stock modal */}
      {adjusting && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-pos-card border border-slate-700 rounded-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-pos-text">Ajustar Stock</h2>
              <button onClick={() => setAdjusting(null)} className="text-pos-muted hover:text-pos-text cursor-pointer"><X size={20} /></button>
            </div>
            <p className="text-sm text-pos-muted">{adjusting.productoNombre}</p>
            <div>
              <label className="text-xs text-pos-muted">Nueva cantidad</label>
              <input type="number" step="1" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-pos-muted">Motivo</label>
              <input value={adjustMotivo} onChange={(e) => setAdjustMotivo(e.target.value)} placeholder="Conteo fisico, merma, etc." className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1 placeholder:text-pos-muted/40" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setAdjusting(null)} className="px-4 py-2 text-sm text-pos-muted hover:text-pos-text cursor-pointer">Cancelar</button>
              <button onClick={handleAdjust} disabled={!adjustQty} className="px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 disabled:opacity-50 transition-colors cursor-pointer">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
