import { useState, useMemo } from "react";
import { Navbar } from "../components/layout/Navbar";
import { Sidebar } from "../components/layout/Sidebar";
import { HotkeyBar } from "../components/layout/HotkeyBar";
import { ProductSearch } from "../components/pos/ProductSearch";
import { CartTable } from "../components/pos/CartTable";
import { CartSummary } from "../components/pos/CartSummary";
import { PaymentModal } from "../components/pos/PaymentModal";
import { useCartStore } from "../stores/cart-store";
import { useHotkeys } from "../hooks/useHotkeys";

export function PosPage() {
  const [activeSection, setActiveSection] = useState("pos");
  const [showPayment, setShowPayment] = useState(false);
  const clear = useCartStore((s) => s.clear);
  const items = useCartStore((s) => s.items);

  const hotkeys = useMemo(
    () => ({
      F1: () => {
        const input = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Escanear"]'
        );
        input?.focus();
      },
      F12: () => {
        if (items.length > 0) setShowPayment(true);
      },
    }),
    [items.length]
  );

  useHotkeys(hotkeys);

  const handlePaymentComplete = () => {
    clear();
    setShowPayment(false);
  };

  return (
    <div className="h-screen flex flex-col bg-pos-bg">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar active={activeSection} onNavigate={setActiveSection} />

        <main className="flex-1 flex flex-col overflow-hidden">
          {activeSection === "pos" && (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col p-4 gap-4">
                <ProductSearch />
                <CartTable />
              </div>
              <CartSummary onPay={() => setShowPayment(true)} />
            </div>
          )}

          {activeSection !== "pos" && (
            <div className="flex-1 flex items-center justify-center text-pos-muted">
              <p className="text-lg">
                Módulo "{activeSection}" — disponible en fases posteriores
              </p>
            </div>
          )}
        </main>
      </div>

      <HotkeyBar />

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onComplete={handlePaymentComplete}
      />
    </div>
  );
}
