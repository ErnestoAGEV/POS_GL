import { useState, useRef, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, Upload, ChevronDown } from "lucide-react";
import { useSyncStore } from "../../stores/sync-store";

export function SyncIndicator() {
  const status = useSyncStore((s) => s.status);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const [open, setOpen] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleFlush = async () => {
    setFlushing(true);
    try {
      await window.api.sync.flush();
    } catch {}
    setFlushing(false);
  };

  const config = {
    online: {
      icon: <Wifi size={14} />,
      label: "Conectado",
      className: "text-pos-green",
      dot: "bg-green-500",
    },
    offline: {
      icon: <WifiOff size={14} />,
      label: "Sin conexion",
      className: "text-pos-red",
      dot: "bg-red-500",
    },
    syncing: {
      icon: <RefreshCw size={14} className="animate-spin" />,
      label: "Sincronizando...",
      className: "text-pos-amber",
      dot: "bg-amber-500",
    },
  };

  const current = config[status];

  const lastSyncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    : "---";

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 text-xs cursor-pointer transition-colors hover:opacity-80 ${current.className}`}
      >
        <span className={`w-2 h-2 rounded-full ${current.dot} animate-pulse`} />
        {current.icon}
        <span>{current.label}</span>
        {pendingCount > 0 && (
          <span className="bg-pos-amber/20 text-pos-amber px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums">
            {pendingCount}
          </span>
        )}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-pos-card border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Status header */}
          <div className={`px-4 py-3 border-b border-slate-700 ${status === "offline" ? "bg-red-500/10" : status === "syncing" ? "bg-amber-500/10" : "bg-green-500/10"}`}>
            <div className={`flex items-center gap-2 ${current.className}`}>
              {current.icon}
              <span className="font-medium text-sm">{current.label}</span>
            </div>
          </div>

          {/* Details */}
          <div className="px-4 py-3 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-pos-muted">Ventas pendientes</span>
              <span className={`font-mono font-bold ${pendingCount > 0 ? "text-pos-amber" : "text-pos-green"}`}>
                {pendingCount}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-pos-muted">Ultima sincronizacion</span>
              <span className="text-pos-text font-mono">{lastSyncLabel}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 py-3 border-t border-slate-700">
            <button
              onClick={handleFlush}
              disabled={flushing || status === "offline" || pendingCount === 0}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-pos-blue/20 text-pos-blue rounded-lg text-xs font-medium hover:bg-pos-blue/30 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {flushing ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {flushing ? "Sincronizando..." : "Sincronizar ahora"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
