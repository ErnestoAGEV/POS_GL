import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export function StockAlertsTab() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    const result = await window.api.inventory.stockAlerts();
    setAlerts(result);
  };

  if (alerts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-pos-muted">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto mb-2 opacity-50" />
          <p>Sin alertas de stock</p>
          <p className="text-sm mt-1">
            Todos los productos estan por encima del minimo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-2">
        {alerts.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between bg-pos-card border border-slate-700 rounded-lg px-4 py-3"
          >
            <div>
              <p className="text-pos-text font-medium">{p.nombre}</p>
              <p className="text-pos-muted text-xs">
                SKU: {p.sku || "\u2014"} | Stock minimo: {p.stockMinimo}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-pos-amber" />
              <span className="text-pos-amber font-bold text-sm">
                Revisar stock
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
