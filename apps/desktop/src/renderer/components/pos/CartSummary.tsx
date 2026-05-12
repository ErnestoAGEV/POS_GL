import { useCartStore } from "../../stores/cart-store";
import { formatCurrency } from "../../lib/format";
import { Button } from "../ui/Button";

interface CartSummaryProps {
  onPay: () => void;
}

export function CartSummary({ onPay }: CartSummaryProps) {
  const items = useCartStore((s) => s.items);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getDiscountTotal = useCartStore((s) => s.getDiscountTotal);
  const getIva = useCartStore((s) => s.getIva);
  const getTotal = useCartStore((s) => s.getTotal);

  const subtotal = getSubtotal();
  const discount = getDiscountTotal();
  const iva = getIva();
  const total = getTotal();
  const itemCount = items.reduce((sum, i) => sum + i.cantidad, 0);

  return (
    <div className="bg-pos-card border-l border-slate-700 w-72 flex flex-col">
      <div className="p-4 flex-1 flex flex-col justify-end gap-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-pos-muted">
            <span>Artículos</span>
            <span className="tabular-nums">{itemCount}</span>
          </div>
          <div className="flex justify-between text-pos-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-pos-amber">
              <span>Descuento</span>
              <span className="tabular-nums">-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-pos-muted">
            <span>IVA</span>
            <span className="tabular-nums">{formatCurrency(iva)}</span>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-3">
          <div className="flex justify-between items-baseline">
            <span className="text-pos-muted text-sm">TOTAL</span>
            <span className="text-4xl font-bold font-heading text-pos-green tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700">
        <Button
          variant="primary"
          size="lg"
          className="w-full text-xl py-4"
          onClick={onPay}
          disabled={items.length === 0}
        >
          COBRAR (F12)
        </Button>
      </div>
    </div>
  );
}
