import { WifiOff } from "lucide-react";
import { useSyncStore } from "../../stores/sync-store";

export function OfflineBanner() {
  const status = useSyncStore((s) => s.status);
  const pendingCount = useSyncStore((s) => s.pendingCount);

  if (status !== "offline") return null;

  return (
    <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2 flex items-center justify-center gap-2 text-pos-red text-xs">
      <WifiOff size={14} />
      <span className="font-medium">
        Modo sin conexion — Las ventas se guardan localmente
        {pendingCount > 0 && ` (${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""})`}
      </span>
    </div>
  );
}
