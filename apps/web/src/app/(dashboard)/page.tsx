"use client";

import { useState, useEffect } from "react";
import { DollarSign, ShoppingCart, TrendingUp, CreditCard, Download } from "lucide-react";
import { exportToExcel } from "@/lib/export-excel";
import { api } from "@/lib/api";
import { SalesChart } from "@/components/SalesChart";
import { TopProductsChart } from "@/components/TopProductsChart";
import { PaymentChart } from "@/components/PaymentChart";

function getDateRange() {
  const now = new Date();
  const desde = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const hasta = now.toISOString();
  return { desde, hasta };
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { desde, hasta } = getDateRange();

    Promise.all([
      api.dashboard.summary(desde, hasta).catch(() => null),
      api.dashboard.dailySales(desde, hasta).catch(() => []),
      api.dashboard.topProducts(desde, hasta).catch(() => []),
      api.dashboard.paymentMethods(desde, hasta).catch(() => []),
    ]).then(([sum, daily, top, payments]) => {
      setSummary(sum);
      setDailySales(daily || []);
      setTopProducts(top || []);
      setPaymentMethods(payments || []);
      setLoading(false);
    });
  }, []);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-pos-text">Dashboard</h1>
          <p className="text-sm text-pos-muted">Resumen del mes actual</p>
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
    </div>
  );
}
