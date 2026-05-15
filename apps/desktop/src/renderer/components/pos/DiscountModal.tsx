import { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useCartStore } from "../../stores/cart-store";
import { formatCurrency } from "../../lib/format";
import { Percent, DollarSign } from "lucide-react";

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, applies discount to specific item. When null, applies global discount. */
  targetProductoId: number | null;
}

export function DiscountModal({ isOpen, onClose, targetProductoId }: DiscountModalProps) {
  const items = useCartStore((s) => s.items);
  const updateItemDiscount = useCartStore((s) => s.updateItemDiscount);
  const setGlobalDiscount = useCartStore((s) => s.setGlobalDiscount);
  const descuentoGlobal = useCartStore((s) => s.descuentoGlobal);
  const getSubtotal = useCartStore((s) => s.getSubtotal);

  const [mode, setMode] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");

  const targetItem = targetProductoId != null
    ? items.find((i) => i.productoId === targetProductoId)
    : null;

  const isGlobal = targetProductoId === null;
  const label = isGlobal ? "Descuento Global" : `Descuento: ${targetItem?.nombre ?? ""}`;

  // Base amount to calculate percentage against
  const baseAmount = isGlobal
    ? getSubtotal()
    : targetItem
      ? targetItem.precioUnitario * targetItem.cantidad
      : 0;

  // Current discount value
  const currentDiscount = isGlobal ? descuentoGlobal : (targetItem?.descuento ?? 0);

  useEffect(() => {
    if (isOpen) {
      if (currentDiscount > 0) {
        setMode("fixed");
        setValue(currentDiscount.toFixed(2));
      } else {
        setMode("percent");
        setValue("");
      }
    }
  }, [isOpen, currentDiscount]);

  const numValue = parseFloat(value) || 0;
  const computedDiscount = mode === "percent"
    ? (baseAmount * Math.min(numValue, 100)) / 100
    : Math.min(numValue, baseAmount);

  const handleApply = () => {
    const disc = Math.max(0, Math.min(computedDiscount, baseAmount));
    if (isGlobal) {
      setGlobalDiscount(disc);
    } else if (targetProductoId != null) {
      updateItemDiscount(targetProductoId, disc);
    }
    onClose();
  };

  const handleRemove = () => {
    if (isGlobal) {
      setGlobalDiscount(0);
    } else if (targetProductoId != null) {
      updateItemDiscount(targetProductoId, 0);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={label} width="max-w-sm">
      <div className="space-y-4">
        {/* Base amount info */}
        <div className="text-center py-2 bg-pos-active rounded-xl">
          <p className="text-pos-muted text-xs">{isGlobal ? "Subtotal" : "Importe del producto"}</p>
          <p className="text-2xl font-bold font-heading text-pos-text tabular-nums">
            {formatCurrency(baseAmount)}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setMode("percent"); setValue(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 ${
              mode === "percent"
                ? "bg-pos-blue text-white"
                : "bg-pos-active text-pos-muted hover:text-pos-text"
            }`}
          >
            <Percent size={18} />
            <span className="text-sm font-medium">Porcentaje</span>
          </button>
          <button
            onClick={() => { setMode("fixed"); setValue(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 ${
              mode === "fixed"
                ? "bg-pos-blue text-white"
                : "bg-pos-active text-pos-muted hover:text-pos-text"
            }`}
          >
            <DollarSign size={18} />
            <span className="text-sm font-medium">Monto fijo</span>
          </button>
        </div>

        {/* Value input */}
        <Input
          label={mode === "percent" ? "Porcentaje (%)" : "Monto ($)"}
          type="number"
          step={mode === "percent" ? "1" : "0.01"}
          min="0"
          max={mode === "percent" ? "100" : baseAmount.toString()}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          autoFocus
        />

        {/* Quick percentages */}
        {mode === "percent" && (
          <div className="flex gap-2 flex-wrap">
            {[5, 10, 15, 20, 25, 50].map((pct) => (
              <button
                key={pct}
                onClick={() => setValue(pct.toString())}
                className="px-3 py-1.5 bg-pos-active rounded-lg text-pos-text text-sm hover:bg-slate-600 cursor-pointer transition-colors"
              >
                {pct}%
              </button>
            ))}
          </div>
        )}

        {/* Preview */}
        {numValue > 0 && (
          <div className="text-center py-2 bg-pos-active rounded-xl">
            <p className="text-pos-muted text-xs">Descuento aplicado</p>
            <p className="text-2xl font-bold font-heading text-pos-amber tabular-nums">
              -{formatCurrency(computedDiscount)}
            </p>
            {mode === "percent" && (
              <p className="text-pos-muted text-xs mt-1">
                Nuevo total: {formatCurrency(baseAmount - computedDiscount)}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {currentDiscount > 0 && (
            <Button variant="danger" size="md" className="flex-1" onClick={handleRemove}>
              Quitar
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            onClick={handleApply}
            disabled={numValue <= 0}
          >
            Aplicar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
