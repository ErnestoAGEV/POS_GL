"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SalesByUserChartProps {
  data: Array<{ nombre: string; ventas: number; total: number; ticketPromedio: number }>;
}

export function SalesByUserChart({ data }: SalesByUserChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-pos-muted text-sm">
        Sin datos de vendedores
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis dataKey="nombre" tick={{ fill: "#94A3B8", fontSize: 11 }} />
        <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0F172A",
            border: "1px solid #334155",
            borderRadius: "8px",
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => [
            name === "total" ? `$${value.toFixed(2)}` : value,
            name === "total" ? "Total" : "Ventas",
          ]}
        />
        <Bar dataKey="total" fill="#22C55E" radius={[4, 4, 0, 0]} name="total" />
        <Bar dataKey="ventas" fill="#3B82F6" radius={[4, 4, 0, 0]} name="ventas" />
      </BarChart>
    </ResponsiveContainer>
  );
}
