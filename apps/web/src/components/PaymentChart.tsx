"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#22C55E", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  credito: "Credito",
  vale_despensa: "Vale Despensa",
  tarjeta_regalo: "T. Regalo",
};

interface PaymentChartProps {
  data: Array<{ formaPago: string; cantidad: number; total: number }>;
}

export function PaymentChart({ data }: PaymentChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-pos-muted text-sm">
        Sin datos de pagos
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    name: LABELS[d.formaPago] || d.formaPago,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={formatted}
          dataKey="total"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={50}
          paddingAngle={2}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={{ stroke: "#94A3B8" }}
        >
          {formatted.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#0F172A",
            border: "1px solid #334155",
            borderRadius: "8px",
            fontSize: 12,
          }}
          formatter={(value: number) => [`$${value.toFixed(2)}`]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
