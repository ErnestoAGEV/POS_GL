import { useState, useEffect } from "react";
import {
  BarChart3,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Receipt,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { formatCurrency } from "../lib/format";

function getDateRange(period: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;

  switch (period) {
    case "today":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      break;
    case "month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "year":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  return { from: from.toISOString(), to };
}

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  credito: "Credito",
  vale_despensa: "Vale Despensa",
  tarjeta_regalo: "Tarjeta Regalo",
};

export function ReportsPage() {
  const [period, setPeriod] = useState("today");
  const [summary, setSummary] = useState<any>(null);
  const [byDay, setByDay] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [byPayment, setByPayment] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
  }, [period]);

  const loadReports = async () => {
    const { from, to } = getDateRange(period);

    const [salesData, products, payments] = await Promise.all([
      window.api.reports.salesSummary(from, to),
      window.api.reports.topProducts(from, to, 10),
      window.api.reports.byPaymentMethod(from, to),
    ]);

    setSummary(salesData.summary);
    setByDay(salesData.byDay);
    setTopProducts(products);
    setByPayment(payments);
  };

  const periods = [
    { id: "today", label: "Hoy" },
    { id: "week", label: "7 dias" },
    { id: "month", label: "Este mes" },
    { id: "year", label: "Este ano" },
  ];

  const totalPayments = byPayment.reduce((s: number, p: any) => s + p.total, 0);

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-pos-text text-xl font-semibold flex items-center gap-2">
          <BarChart3 size={22} />
          Reportes
        </h1>
        <div className="flex gap-1 bg-pos-card rounded-lg p-1 border border-slate-700">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                period === p.id
                  ? "bg-pos-active text-pos-text"
                  : "text-pos-muted hover:text-pos-text"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-pos-card border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 text-pos-muted mb-2">
            <DollarSign size={18} />
            <span className="text-xs uppercase tracking-wider">Total Ventas</span>
          </div>
          <p className="text-2xl font-bold text-pos-green tabular-nums">
            {formatCurrency(summary?.totalMonto ?? 0)}
          </p>
        </div>

        <div className="bg-pos-card border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 text-pos-muted mb-2">
            <Receipt size={18} />
            <span className="text-xs uppercase tracking-wider">Num. Tickets</span>
          </div>
          <p className="text-2xl font-bold text-pos-text tabular-nums">
            {summary?.totalVentas ?? 0}
          </p>
        </div>

        <div className="bg-pos-card border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 text-pos-muted mb-2">
            <TrendingUp size={18} />
            <span className="text-xs uppercase tracking-wider">Ticket Promedio</span>
          </div>
          <p className="text-2xl font-bold text-pos-blue tabular-nums">
            {formatCurrency(summary?.ticketPromedio ?? 0)}
          </p>
        </div>

        <div className="bg-pos-card border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 text-pos-muted mb-2">
            <ShoppingBag size={18} />
            <span className="text-xs uppercase tracking-wider">Descuentos</span>
          </div>
          <p className="text-2xl font-bold text-pos-amber tabular-nums">
            {formatCurrency(summary?.totalDescuento ?? 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Daily Sales Bar Chart (text-based) */}
        <div className="bg-pos-card border border-slate-700 rounded-xl p-5">
          <h2 className="text-pos-text font-semibold mb-4">Ventas por Dia</h2>
          {byDay.length === 0 ? (
            <p className="text-pos-muted text-sm">Sin datos para este periodo</p>
          ) : (
            <div className="space-y-2">
              {byDay.map((d: any) => {
                const maxTotal = Math.max(...byDay.map((x: any) => x.total));
                const pct = maxTotal > 0 ? (d.total / maxTotal) * 100 : 0;
                return (
                  <div key={d.dia} className="flex items-center gap-3">
                    <span className="text-pos-muted text-xs w-20 shrink-0">
                      {d.dia}
                    </span>
                    <div className="flex-1 bg-pos-bg rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-pos-blue/60 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-pos-text text-xs w-24 text-right tabular-nums">
                      {formatCurrency(d.total)}
                    </span>
                    <span className="text-pos-muted text-xs w-12 text-right">
                      {d.ventas}t
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-pos-card border border-slate-700 rounded-xl p-5">
          <h2 className="text-pos-text font-semibold mb-4">
            Ventas por Forma de Pago
          </h2>
          {byPayment.length === 0 ? (
            <p className="text-pos-muted text-sm">Sin datos para este periodo</p>
          ) : (
            <div className="space-y-3">
              {byPayment.map((p: any) => {
                const pct = totalPayments > 0 ? (p.total / totalPayments) * 100 : 0;
                return (
                  <div key={p.formaPago}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-pos-text">
                        {PAYMENT_LABELS[p.formaPago] || p.formaPago}
                      </span>
                      <span className="text-pos-muted tabular-nums">
                        {formatCurrency(p.total)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="bg-pos-bg rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-pos-green/60 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-pos-card border border-slate-700 rounded-xl p-5 mt-6">
        <h2 className="text-pos-text font-semibold mb-4">
          Productos Mas Vendidos
        </h2>
        {topProducts.length === 0 ? (
          <p className="text-pos-muted text-sm">Sin datos para este periodo</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-pos-muted text-xs uppercase tracking-wider border-b border-slate-700">
                <th className="text-left py-2 px-3 w-8">#</th>
                <th className="text-left py-2 px-3">Producto</th>
                <th className="text-left py-2 px-3 w-24">SKU</th>
                <th className="text-right py-2 px-3 w-24">Cantidad</th>
                <th className="text-right py-2 px-3 w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p: any, i: number) => (
                <tr
                  key={p.productoId}
                  className="border-b border-slate-800 hover:bg-pos-active/30 transition-colors"
                >
                  <td className="py-2 px-3 text-pos-muted text-sm">{i + 1}</td>
                  <td className="py-2 px-3 text-pos-text text-sm font-medium">
                    {p.nombre}
                  </td>
                  <td className="py-2 px-3 text-pos-muted text-xs font-mono">
                    {p.sku || "\u2014"}
                  </td>
                  <td className="py-2 px-3 text-right text-pos-text tabular-nums">
                    {p.cantidadTotal}
                  </td>
                  <td className="py-2 px-3 text-right text-pos-green font-medium tabular-nums">
                    {formatCurrency(p.montoTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
