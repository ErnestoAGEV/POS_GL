import { useState, useEffect } from "react";
import { Store, Monitor, User, Clock } from "lucide-react";
import { useAuthStore } from "../../stores/auth-store";
import { useAppStore } from "../../stores/app-store";
import { formatTime } from "../../lib/format";

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const sucursalNombre = useAppStore((s) => s.sucursalNombre);
  const terminalNombre = useAppStore((s) => s.terminalNombre);
  const [time, setTime] = useState(formatTime());

  useEffect(() => {
    const interval = setInterval(() => setTime(formatTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-pos-card border-b border-slate-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold font-heading text-pos-green">POSGL</h1>
      </div>

      <div className="flex items-center gap-6 text-sm text-pos-muted">
        <div className="flex items-center gap-2">
          <Store size={16} />
          <span>{sucursalNombre}</span>
        </div>
        <div className="flex items-center gap-2">
          <Monitor size={16} />
          <span>{terminalNombre}</span>
        </div>
        <div className="flex items-center gap-2">
          <User size={16} />
          <span className="text-pos-text">{user?.nombre || "Sin usuario"}</span>
          <span className="text-xs bg-pos-active px-2 py-0.5 rounded">{user?.rol}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} />
          <span className="tabular-nums">{time}</span>
        </div>
      </div>
    </header>
  );
}
