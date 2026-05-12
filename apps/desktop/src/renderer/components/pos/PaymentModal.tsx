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
} from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const paymentMethods = [
  { id: "efectivo", label: "Efectivo", icon: <Banknote size={20} /> },
  { id: "tarjeta", label: "Tarjeta", icon: <CreditCard size={20} /> },
  { id: "transferencia", label: "Transferencia", icon: <ArrowRightLeft size={20} /> },
  { id: "vale_despensa", label: "Vales", icon: <Receipt size={20} /> },
  { id: "tarjeta_regalo", label: "T. Regalo", icon: <Gift size={20} /> },
];

export function PaymentModal({ isOpen, onClose, onComplete }: PaymentModalProps) {
  const getTotal = useCartStore((s) => s.getTotal);
  const total = getTotal();

  const [selectedMethod, setSelectedMethod] = useState("efectivo");
  const [amountReceived, setAmountReceived] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmountReceived("");
      setSelectedMethod("efectivo");
    }
  }, [isOpen]);

  const received = parseFloat(amountReceived) || 0;
  const change = received - total;

  const handleComplete = () => {
    onComplete();
    setAmountReceived("");
    setSelectedMethod("efectivo");
  };

  const quickAmounts = [
    Math.ceil(total),
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 50) * 50,
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 500) * 500,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cobrar" width="max-w-md">
      <div className="space-y-4">
        <div className="text-center py-2">
          <p className="text-pos-muted text-sm">Total a cobrar</p>
          <p className="text-5xl font-bold font-heading text-pos-green tabular-nums">
            {formatCurrency(total)}
          </p>
        </div>

        <div className="flex gap-2">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              className={`
                flex-1 flex flex-col items-center gap-1 py-3 rounded-xl cursor-pointer transition-colors duration-150
                ${
                  selectedMethod === method.id
                    ? "bg-pos-blue text-white"
                    : "bg-pos-active text-pos-muted hover:text-pos-text"
                }
              `}
            >
              {method.icon}
              <span className="text-xs font-medium">{method.label}</span>
            </button>
          ))}
        </div>

        {selectedMethod === "efectivo" && (
          <>
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
          </>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleComplete}
          disabled={selectedMethod === "efectivo" && received < total}
        >
          Completar Venta
        </Button>
      </div>
    </Modal>
  );
}
