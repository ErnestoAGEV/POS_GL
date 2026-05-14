"use client";

import { useState, useEffect } from "react";
import { BarChart3, Download, DollarSign, ShoppingCart, TrendingUp, CreditCard } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";
import { SalesChart } from "@/components/SalesChart";
import { TopProductsChart } from "@/components/TopProductsChart";
import { PaymentChart } from "@/components/PaymentChart";

function defaultDesde() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function defaultHasta() {
  return new Date().toISOString().split("T")[0];
}

export default function ReportesPage() {
  const [desde, setDesde] = useState(defaultDesde);
  const [hasta, setHasta] = useState(defaultHasta);
  const [summary, setSummary] = useState<any>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [desde, hasta]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, d, tp, pm] = await Promise.all([
        api.dashboard.summary(desde, hasta),
        api.dashboard.dailySales(desde, hasta),
        api.dashboard.topProducts(desde, hasta, 10),
        api.dashboard.paymentMethods(desde, hasta),
      ]);
      setSummary(s);
      setDaily(d || []);
      setTopProducts(tp || []);
      setPayments(pm || []);
    } catch {
      setSummary(null);
      setDaily([]);
      setTopProducts([]);
      setPayments([]);
    }
    setLoading(false);
  };

  const kpis = summary
    ? [
        { label: "Total Ventas", value: `$${summary.totalMonto?.toFixed(2) || "0.00"}`, icon: DollarSign, color: "text-pos-green" },
        { label: "Num. Ventas", value: summary.totalVentas || 0, icon: ShoppingCart, color: "text-pos-blue" },
        { label: "Ticket Promedio", value: `$${summary.ticketPromedio?.toFixed(2) || "0.00"}`, icon: TrendingUp, color: "text-pos-amber" },
        { label: "Descuentos", value: `$${summary.totalDescuento?.toFixed(2) || "0.00"}`, icon: CreditCard, color: "text-pos-red" },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-pos-green" />
          <h1 className="text-2xl font-bold text-pos-text">Reportes</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm"
            />
            <span className="text-pos-muted text-sm">a</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm"
            />
          </div>
          {summary && (
            <button
              onClick={() =>
                exportToExcel(
                  [{ "Total Ventas": summary.totalMonto, "Num Ventas": summary.totalVentas, "Ticket Promedio": summary.ticketPromedio, Descuentos: summary.totalDescuento, Desde: desde, Hasta: hasta }],
                  "reporte"
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

      {loading ? (
        <div className="text-center text-pos-muted py-20">Cargando reportes...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            {kpis.map((k) => (
              <div key={k.label} className="bg-pos-card border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <k.icon size={16} className={k.color} />
                  <span className="text-pos-muted text-xs">{k.label}</span>
                </div>
                <p className="text-pos-text text-2xl font-bold">{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-pos-card border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-medium text-pos-text mb-4">Ventas Diarias</h3>
              <SalesChart data={daily} />
            </div>
            <div className="bg-pos-card border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-medium text-pos-text mb-4">Metodos de Pago</h3>
              <PaymentChart data={payments} />
            </div>
          </div>

          <div className="bg-pos-card border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-medium text-pos-text mb-4">Top 10 Productos</h3>
            <TopProductsChart data={topProducts} />
          </div>
        </>
      )}
    </div>
  );
}
