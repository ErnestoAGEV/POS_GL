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

interface HourlySalesChartProps {
  data: Array<{ hora: number; ventas: number; total: number }>;
}

export function HourlySalesChart({ data }: HourlySalesChartProps) {
  if (data.length === 0 || data.every((d) => d.ventas === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-pos-muted text-sm">
        Sin datos por hora
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: `${String(d.hora).padStart(2, "0")}:00`,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 10 }} interval={1} />
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
            name === "total" ? "Total" : "Transacciones",
          ]}
        />
        <Bar dataKey="ventas" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="ventas" />
      </BarChart>
    </ResponsiveContainer>
  );
}
