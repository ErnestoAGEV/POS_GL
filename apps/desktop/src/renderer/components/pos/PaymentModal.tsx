import { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useCartStore } from "../../stores/cart-store";
import { formatCurrency } from "../../lib/format";
import {
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Receipt,
  Gift,
  Plus,
  Trash2,
} from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (pagos: Array<{ formaPago: string; monto: number; referencia?: string }>) => void;
}

const paymentMethods = [
  { id: "efectivo", label: "Efectivo", icon: Banknote },
  { id: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { id: "transferencia", label: "Transfer.", icon: ArrowRightLeft },
  { id: "vale_despensa", label: "Vales", icon: Receipt },
  { id: "tarjeta_regalo", label: "T. Regalo", icon: Gift },
];

interface PagoLine {
  formaPago: string;
  monto: string;
  referencia: string;
}

export function PaymentModal({ isOpen, onClose, onComplete }: PaymentModalProps) {
  const getTotal = useCartStore((s) => s.getTotal);
  const total = getTotal();

  const [pagos, setPagos] = useState<PagoLine[]>([
    { formaPago: "efectivo", monto: "", referencia: "" },
  ]);
  const [amountReceived, setAmountReceived] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPagos([{ formaPago: "efectivo", monto: "", referencia: "" }]);
      setAmountReceived("");
    }
  }, [isOpen]);

  const isSingleCash = pagos.length === 1 && pagos[0].formaPago === "efectivo";

  const totalAssigned = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const remaining = total - totalAssigned;

  // For single-cash mode, use amountReceived for change calc
  const received = parseFloat(amountReceived) || 0;
  const change = isSingleCash ? received - total : totalAssigned - total;

  const canComplete = isSingleCash
    ? received >= total
    : totalAssigned >= total - 0.01;

  const addPago = () => {
    setPagos([...pagos, { formaPago: "efectivo", monto: "", referencia: "" }]);
  };

  const removePago = (idx: number) => {
    if (pagos.length <= 1) return;
    setPagos(pagos.filter((_, i) => i !== idx));
  };

  const updatePago = (idx: number, field: keyof PagoLine, value: string) => {
    setPagos(pagos.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const fillRemaining = (idx: number) => {
    const otherTotal = pagos.reduce(
      (s, p, i) => s + (i !== idx ? parseFloat(p.monto) || 0 : 0),
      0
    );
    const rem = Math.max(0, total - otherTotal);
    updatePago(idx, "monto", rem.toFixed(2));
  };

  const handleComplete = () => {
    if (isSingleCash) {
      onComplete([{ formaPago: "efectivo", monto: total }]);
    } else {
      onComplete(
        pagos
          .filter((p) => (parseFloat(p.monto) || 0) > 0)
          .map((p) => ({
            formaPago: p.formaPago,
            monto: parseFloat(p.monto) || 0,
            ...(p.referencia ? { referencia: p.referencia } : {}),
          }))
      );
    }
  };

  const quickAmounts = [
    Math.ceil(total),
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 50) * 50,
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 500) * 500,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cobrar" width="max-w-lg">
      <div className="space-y-4">
        <div className="text-center py-2">
          <p className="text-pos-muted text-sm">Total a cobrar</p>
          <p className="text-5xl font-bold font-heading text-pos-green tabular-nums">
            {formatCurrency(total)}
          </p>
        </div>

        {isSingleCash ? (
          /* ---- Single cash payment (original UX) ---- */
          <>
            <div className="flex gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => {
                    if (method.id !== "efectivo") {
                      // Switch to multi-payment mode with this method
                      setPagos([{ formaPago: method.id, monto: total.toFixed(2), referencia: "" }]);
                    }
                  }}
                  className={`
                    flex-1 flex flex-col items-center gap-1 py-3 rounded-xl cursor-pointer transition-colors duration-150
                    ${
                      method.id === "efectivo"
                        ? "bg-pos-blue text-white"
                        : "bg-pos-active text-pos-muted hover:text-pos-text"
                    }
                  `}
                >
                  <method.icon size={20} />
                  <span className="text-xs font-medium">{method.label}</span>
                </button>
              ))}
            </div>

            <Input
              label="Monto recibido"
              type="number"
              step="0.01"
              min="0"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder="0.00"
              autoFocus
            />

            <div className="flex gap-2 flex-wrap">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setAmountReceived(amount.toString())}
                  className="px-3 py-1.5 bg-pos-active rounded-lg text-pos-text text-sm hover:bg-slate-600 cursor-pointer transition-colors"
                >
                  {formatCurrency(amount)}
                </button>
              ))}
            </div>

            {received > 0 && (
              <div className="text-center py-2 bg-pos-active rounded-xl">
                <p className="text-pos-muted text-sm">Cambio</p>
                <p
                  className={`text-3xl font-bold font-heading tabular-nums ${
                    change >= 0 ? "text-pos-green" : "text-pos-red"
                  }`}
                >
                  {formatCurrency(Math.max(0, change))}
                </p>
              </div>
            )}

            <button
              onClick={addPago}
              className="flex items-center gap-2 text-pos-blue text-sm hover:text-blue-400 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Pago mixto (dividir en varios métodos)
            </button>
          </>
        ) : (
          /* ---- Multi-payment mode ---- */
          <>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {pagos.map((pago, idx) => {
                const Icon = paymentMethods.find((m) => m.id === pago.formaPago)?.icon ?? Banknote;
                return (
                  <div key={idx} className="bg-pos-active/50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={pago.formaPago}
                        onChange={(e) => updatePago(idx, "formaPago", e.target.value)}
                        className="flex-1 bg-pos-card border border-slate-700 text-pos-text px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pos-blue"
                      >
                        {paymentMethods.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <span className="text-pos-muted text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pago.monto}
                          onChange={(e) => updatePago(idx, "monto", e.target.value)}
                          placeholder="0.00"
                          className="w-28 bg-pos-card border border-slate-700 text-pos-text px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pos-blue tabular-nums"
                          autoFocus={idx === pagos.length - 1}
                        />
                      </div>
                      <button
                        onClick={() => fillRemaining(idx)}
                        title="Llenar resto"
                        className="px-2 py-2 bg-pos-green/20 text-pos-green rounded-lg text-xs hover:bg-pos-green/30 cursor-pointer transition-colors"
                      >
                        Resto
                      </button>
                      {pagos.length > 1 && (
                        <button
                          onClick={() => removePago(idx)}
                          className="text-pos-muted hover:text-pos-red cursor-pointer transition-colors p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    {pago.formaPago !== "efectivo" && (
                      <input
                        type="text"
                        value={pago.referencia}
                        onChange={(e) => updatePago(idx, "referencia", e.target.value)}
                        placeholder="Referencia (opcional)"
                        className="w-full bg-pos-card border border-slate-700 text-pos-text px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-pos-blue"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={addPago}
                className="flex items-center gap-2 text-pos-blue text-sm hover:text-blue-400 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                Agregar método
              </button>
              <button
                onClick={() => {
                  setPagos([{ formaPago: "efectivo", monto: "", referencia: "" }]);
                  setAmountReceived("");
                }}
                className="text-pos-muted text-sm hover:text-pos-text transition-colors cursor-pointer"
              >
                Pago simple
              </button>
            </div>

            {/* Remaining / Overpaid indicator */}
            <div className="text-center py-2 bg-pos-active rounded-xl">
              {remaining > 0.01 ? (
                <>
                  <p className="text-pos-muted text-sm">Falta</p>
                  <p className="text-2xl font-bold font-heading tabular-nums text-pos-amber">
                    {formatCurrency(remaining)}
                  </p>
                </>
              ) : change > 0.01 ? (
                <>
                  <p className="text-pos-muted text-sm">Cambio</p>
                  <p className="text-2xl font-bold font-heading tabular-nums text-pos-green">
                    {formatCurrency(change)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-pos-muted text-sm">Pago</p>
                  <p className="text-2xl font-bold font-heading tabular-nums text-pos-green">
                    Exacto
                  </p>
                </>
              )}
            </div>
          </>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleComplete}
          disabled={!canComplete}
        >
          Completar Venta
        </Button>
      </div>
    </Modal>
  );
}
