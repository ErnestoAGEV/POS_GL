import { useState } from "react";
import { Package, AlertTriangle } from "lucide-react";
import { ProductsTab } from "../components/inventory/ProductsTab";
import { StockAlertsTab } from "../components/inventory/StockAlertsTab";

const tabs = [
  { id: "products", label: "Productos", icon: <Package size={16} /> },
  { id: "alerts", label: "Alertas Stock", icon: <AlertTriangle size={16} /> },
];

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-4 pt-4 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium cursor-pointer transition-colors
              ${
                activeTab === tab.id
                  ? "bg-pos-card text-pos-text border-t border-x border-slate-700"
                  : "text-pos-muted hover:text-pos-text"
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-pos-card border-t border-slate-700 overflow-hidden">
        {activeTab === "products" && <ProductsTab />}
        {activeTab === "alerts" && <StockAlertsTab />}
      </div>
    </div>
  );
}
