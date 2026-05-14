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

interface TopProductsChartProps {
  data: Array<{ nombre: string; cantidadTotal: number; montoTotal: number }>;
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-pos-muted text-sm">
        Sin datos de productos
      </div>
    );
  }

  const formatted = data.slice(0, 10).map((d) => ({
    ...d,
    nombre: d.nombre.length > 20 ? d.nombre.substring(0, 20) + "..." : d.nombre,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="nombre"
          tick={{ fill: "#94A3B8", fontSize: 11 }}
          width={140}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0F172A",
            border: "1px solid #334155",
            borderRadius: "8px",
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => [
            name === "montoTotal" ? `$${value.toFixed(2)}` : value,
            name === "montoTotal" ? "Monto" : "Cantidad",
          ]}
        />
        <Bar dataKey="cantidadTotal" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Cantidad" />
      </BarChart>
    </ResponsiveContainer>
  );
}
