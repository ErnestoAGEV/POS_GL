import { useState } from "react";
import { X, Package, Calendar } from "lucide-react";

interface ApartadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (data: { enganche: number; clienteId?: number; fechaLimite?: string }) => void;
}

export function ApartadoModal({ isOpen, onClose, total, onConfirm }: ApartadoModalProps) {
  const [enganche, setEnganche] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const engancheNum = parseFloat(enganche) || 0;
  const saldoPendiente = total - engancheNum;
  const valid = engancheNum > 0 && engancheNum <= total;

  const handleConfirm = async () => {
    if (!valid) return;
    setProcessing(true);
    await onConfirm({
      enganche: engancheNum,
      fechaLimite: fechaLimite || undefined,
    });
    setProcessing(false);
    setEnganche("");
    setFechaLimite("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-pos-card border border-slate-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-pos-amber" />
            <h2 className="text-lg font-semibold text-pos-text">Crear Apartado</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-pos-active rounded-lg transition-colors cursor-pointer">
            <X size={20} className="text-pos-muted" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-pos-bg border border-slate-700 rounded-xl p-3 text-center">
            <div className="text-xs text-pos-muted mb-1">Total del apartado</div>
            <div className="text-2xl font-bold text-pos-green font-mono">${total.toFixed(2)}</div>
          </div>

          <div>
            <label className="block text-xs text-pos-muted mb-1">Enganche (pago inicial)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted">$</span>
              <input
                type="number"
                value={enganche}
                onChange={(e) => setEnganche(e.target.value)}
                placeholder="0.00"
                className="w-full bg-pos-bg border border-slate-700 rounded-lg pl-7 pr-3 py-2.5 text-lg text-pos-text font-mono focus:border-pos-amber focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {engancheNum > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex justify-between">
              <span className="text-sm text-pos-amber">Saldo pendiente:</span>
              <span className="text-sm font-mono font-semibold text-pos-amber">
                ${saldoPendiente.toFixed(2)}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs text-pos-muted mb-1">
              <Calendar size={12} className="inline mr-1" />
              Fecha limite (opcional)
            </label>
            <input
              type="date"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
              className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-amber focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm text-pos-muted hover:text-pos-text transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!valid || processing}
              className="flex-1 px-4 py-2.5 bg-pos-amber text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Procesando..." : "Crear Apartado"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
