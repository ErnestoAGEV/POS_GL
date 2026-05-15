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

interface SalesByBranchChartProps {
  data: Array<{ nombre: string; ventas: number; total: number }>;
}

export function SalesByBranchChart({ data }: SalesByBranchChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-pos-muted text-sm">
        Sin datos por sucursal
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
        <Bar dataKey="total" fill="#F59E0B" radius={[4, 4, 0, 0]} name="total" />
      </BarChart>
    </ResponsiveContainer>
  );
}
