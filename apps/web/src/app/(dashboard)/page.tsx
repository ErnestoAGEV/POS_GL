"use client";

import { useState, useEffect } from "react";
import { DollarSign, ShoppingCart, TrendingUp, CreditCard, Download, AlertTriangle } from "lucide-react";
import { exportToExcel } from "@/lib/export-excel";
import { api } from "@/lib/api";
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

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

function KPICard({ title, value, subtitle, icon, color }: KPICardProps) {
  return (
    <div className="bg-pos-card border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-pos-muted">{title}</span>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-pos-text font-mono">{value}</div>
      {subtitle && <div className="text-xs text-pos-muted mt-1">{subtitle}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState(defaultDesde);
  const [hasta, setHasta] = useState(defaultHasta);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.dashboard.summary(desde, hasta).catch(() => null),
      api.dashboard.dailySales(desde, hasta).catch(() => []),
      api.dashboard.topProducts(desde, hasta).catch(() => []),
      api.dashboard.paymentMethods(desde, hasta).catch(() => []),
      api.stock.alertsGlobal().catch(() => ({ data: [] })),
    ]).then(([sum, daily, top, payments, alerts]) => {
      setSummary(sum);
      setDailySales(daily || []);
      setTopProducts(top || []);
      setPaymentMethods(payments || []);
      setStockAlerts(alerts?.data || []);
      setLoading(false);
    });
  }, [desde, hasta]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-pos-muted">Cargando dashboard...</div>
      </div>
    );
  }

  const totalVentas = summary?.totalVentas || 0;
  const totalMonto = summary?.totalMonto || 0;
  const ticketPromedio = summary?.ticketPromedio || 0;
  const totalDescuento = summary?.totalDescuento || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-pos-text">Dashboard</h1>
          <p className="text-sm text-pos-muted">Resumen del periodo seleccionado</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm" />
          <span className="text-pos-muted text-sm">a</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm" />
        </div>
        <button
          onClick={() => {
            const exportData = [
              { Concepto: "Ventas Totales", Valor: totalMonto },
              { Concepto: "Transacciones", Valor: totalVentas },
              { Concepto: "Ticket Promedio", Valor: ticketPromedio },
              { Concepto: "Descuentos", Valor: totalDescuento },
            ];
            exportToExcel(exportData, "resumen-dashboard");
          }}
          className="flex items-center gap-2 px-4 py-2 bg-pos-green/20 text-pos-green rounded-lg text-sm hover:bg-pos-green/30 transition-colors cursor-pointer"
        >
          <Download size={16} />
          Exportar Excel
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          title="Ventas Totales"
          value={`$${totalMonto.toFixed(2)}`}
          subtitle={`${totalVentas} transacciones`}
          icon={<DollarSign size={18} className="text-pos-green" />}
          color="bg-green-500/10"
        />
        <KPICard
          title="Ticket Promedio"
          value={`$${ticketPromedio.toFixed(2)}`}
          icon={<ShoppingCart size={18} className="text-pos-blue" />}
          color="bg-blue-500/10"
        />
        <KPICard
          title="Descuentos"
          value={`$${totalDescuento.toFixed(2)}`}
          icon={<TrendingUp size={18} className="text-pos-amber" />}
          color="bg-amber-500/10"
        />
        <KPICard
          title="Metodos de Pago"
          value={`${paymentMethods.length}`}
          subtitle="formas de pago utilizadas"
          icon={<CreditCard size={18} className="text-purple-400" />}
          color="bg-purple-500/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-pos-card border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-medium text-pos-text mb-4">Ventas Diarias</h3>
          <SalesChart data={dailySales} />
        </div>
        <div className="bg-pos-card border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-medium text-pos-text mb-4">Metodos de Pago</h3>
          <PaymentChart data={paymentMethods} />
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-pos-card border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-medium text-pos-text mb-4">Productos Mas Vendidos</h3>
        <TopProductsChart data={topProducts} />
      </div>

      {/* Stock Alerts */}
      {stockAlerts.length > 0 && (
        <div className="bg-pos-card border border-amber-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-pos-amber" />
            <h3 className="text-sm font-medium text-pos-amber">Alertas de Stock Bajo ({stockAlerts.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {stockAlerts.slice(0, 9).map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-pos-bg/50 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-pos-text truncate">{a.productoNombre}</p>
                  <p className="text-xs text-pos-muted">{a.sucursalNombre}</p>
                </div>
                <div className="text-right ml-2 shrink-0">
                  <span className="text-pos-red font-mono text-sm font-bold">{a.cantidad}</span>
                  <span className="text-pos-muted text-xs">/{a.stockMinimo}</span>
                </div>
              </div>
            ))}
          </div>
          {stockAlerts.length > 9 && (
            <p className="text-xs text-pos-muted mt-2 text-center">y {stockAlerts.length - 9} alertas mas...</p>
          )}
        </div>
      )}
    </div>
  );
}
