import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useSyncStore } from "../../stores/sync-store";

export function SyncIndicator() {
  const status = useSyncStore((s) => s.status);

  const config = {
    online: {
      icon: <Wifi size={14} />,
      label: "Conectado",
      className: "text-pos-green",
    },
    offline: {
      icon: <WifiOff size={14} />,
      label: "Sin conexion",
      className: "text-pos-red",
    },
    syncing: {
      icon: <RefreshCw size={14} className="animate-spin" />,
      label: "Sincronizando...",
      className: "text-pos-amber",
    },
  };

  const current = config[status];

  return (
    <div className={`flex items-center gap-1.5 text-xs ${current.className}`}>
      {current.icon}
      <span>{current.label}</span>
    </div>
  );
}
