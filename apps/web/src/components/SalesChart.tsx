"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SalesChartProps {
  data: Array<{ dia: string; ventas: number; total: number }>;
}

export function SalesChart({ data }: SalesChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-pos-muted text-sm">
        Sin datos de ventas
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.dia + "T12:00:00").toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} />
        <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0F172A",
            border: "1px solid #334155",
            borderRadius: "8px",
            fontSize: 12,
          }}
          labelStyle={{ color: "#F8FAFC" }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, "Total"]}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#22C55E"
          strokeWidth={2}
          dot={{ fill: "#22C55E", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
