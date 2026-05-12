import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { formatCurrency } from "../../lib/format";

const DENOMINACIONES = [
  { label: "$1,000", valor: 1000 },
  { label: "$500", valor: 500 },
  { label: "$200", valor: 200 },
  { label: "$100", valor: 100 },
  { label: "$50", valor: 50 },
  { label: "$20", valor: 20 },
  { label: "$10", valor: 10 },
  { label: "$5", valor: 5 },
  { label: "$2", valor: 2 },
  { label: "$1", valor: 1 },
  { label: "$0.50", valor: 0.5 },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onClosed: () => void;
  corteId: number;
  efectivoSistema: number;
  totalVentas: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  totalOtros: number;
}

export function CloseShiftModal({
  isOpen,
  onClose,
  onClosed,
  corteId,
  efectivoSistema,
  totalVentas,
  totalEfectivo,
  totalTarjeta,
  totalTransferencia,
  totalOtros,
}: Props) {
  const [tipo, setTipo] = useState<"parcial" | "final">("final");
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  const efectivoDeclarado = DENOMINACIONES.reduce(
    (sum, d) => sum + (cantidades[d.valor] || 0) * d.valor,
    0
  );

  const diferencia = efectivoDeclarado - efectivoSistema;

  const handleClose = async () => {
    setSaving(true);

    await window.api.cortes.cerrar(corteId, {
      tipo,
      efectivoDeclarado,
      efectivoSistema,
      totalVentas,
      totalEfectivo,
      totalTarjeta,
      totalTransferencia,
      totalOtros,
    });

    setSaving(false);
    setCantidades({});
    onClosed();
    onClose();
  };

  const setCantidad = (valor: number, count: string) => {
    setCantidades((prev) => ({
      ...prev,
      [valor]: parseInt(count, 10) || 0,
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cerrar Corte">
      <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4">
        {/* Type */}
        <div className="flex gap-2">
          <button
            onClick={() => setTipo("parcial")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
              tipo === "parcial"
                ? "bg-blue-500/20 text-pos-blue border border-blue-500/50"
                : "bg-pos-bg text-pos-muted border border-slate-700"
            }`}
          >
            Parcial
          </button>
          <button
            onClick={() => setTipo("final")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
              tipo === "final"
                ? "bg-amber-500/20 text-pos-amber border border-amber-500/50"
                : "bg-pos-bg text-pos-muted border border-slate-700"
            }`}
          >
            Final
          </button>
        </div>

        {/* Summary */}
        <div className="bg-pos-bg rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-pos-muted">Total Ventas</span>
            <span className="text-pos-text">{formatCurrency(totalVentas)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-pos-muted">Efectivo</span>
            <span className="text-pos-text">{formatCurrency(totalEfectivo)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-pos-muted">Tarjeta</span>
            <span className="text-pos-text">{formatCurrency(totalTarjeta)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-pos-muted">Transferencia</span>
            <span className="text-pos-text">{formatCurrency(totalTransferencia)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-pos-muted">Otros</span>
            <span className="text-pos-text">{formatCurrency(totalOtros)}</span>
          </div>
          <div className="border-t border-slate-700 pt-2 flex justify-between font-medium">
            <span className="text-pos-muted">Efectivo en Sistema</span>
            <span className="text-pos-green">{formatCurrency(efectivoSistema)}</span>
          </div>
        </div>

        {/* Denomination count */}
        <div>
          <p className="text-pos-muted text-xs uppercase tracking-wider mb-3">
            Conteo de Efectivo
          </p>
          <div className="space-y-2">
            {DENOMINACIONES.map((d) => (
              <div key={d.valor} className="flex items-center gap-3">
                <span className="text-pos-text text-sm w-16 text-right">
                  {d.label}
                </span>
                <span className="text-pos-muted text-sm">x</span>
                <input
                  type="number"
                  min="0"
                  value={cantidades[d.valor] || ""}
                  onChange={(e) => setCantidad(d.valor, e.target.value)}
                  className="w-20 bg-pos-bg border border-slate-700 text-pos-text text-sm px-3 py-1.5 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-pos-blue"
                  placeholder="0"
                />
                <span className="text-pos-muted text-sm w-24 text-right tabular-nums">
                  {formatCurrency((cantidades[d.valor] || 0) * d.valor)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Result */}
        <div className="bg-pos-bg rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-pos-muted">Efectivo Declarado</span>
            <span className="text-pos-text font-medium">
              {formatCurrency(efectivoDeclarado)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-pos-muted">Efectivo Sistema</span>
            <span className="text-pos-text">{formatCurrency(efectivoSistema)}</span>
          </div>
          <div className="border-t border-slate-700 pt-2 flex justify-between font-bold">
            <span className="text-pos-muted">Diferencia</span>
            <span
              className={
                diferencia === 0
                  ? "text-pos-green"
                  : diferencia > 0
                  ? "text-pos-blue"
                  : "text-pos-red"
              }
            >
              {diferencia > 0 ? "+" : ""}
              {formatCurrency(diferencia)}
              {diferencia > 0
                ? " (sobrante)"
                : diferencia < 0
                ? " (faltante)"
                : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={handleClose} disabled={saving}>
          {saving ? "Cerrando..." : `Cerrar Corte ${tipo === "final" ? "Final" : "Parcial"}`}
        </Button>
      </div>
    </Modal>
  );
}
