import { useState, useMemo } from "react";
import { Navbar } from "../components/layout/Navbar";
import { Sidebar } from "../components/layout/Sidebar";
import { HotkeyBar } from "../components/layout/HotkeyBar";
import { ProductSearch } from "../components/pos/ProductSearch";
import { CartTable } from "../components/pos/CartTable";
import { CartSummary } from "../components/pos/CartSummary";
import { PaymentModal } from "../components/pos/PaymentModal";
import { InventoryPage } from "./InventoryPage";
import { ClientsPage } from "./ClientsPage";
import { CashCutsPage } from "./CashCutsPage";
import { ReportsPage } from "./ReportsPage";
import { SettingsPage } from "./SettingsPage";
import { InvoicesPage } from "./InvoicesPage";
import { PromosPage } from "./PromosPage";
import { BitacoraPage } from "./BitacoraPage";
import { useCartStore } from "../stores/cart-store";
import { useAuthStore } from "../stores/auth-store";
import { useAppStore } from "../stores/app-store";
import { useHotkeys } from "../hooks/useHotkeys";

export function PosPage() {
  const [activeSection, setActiveSection] = useState("pos");
  const [showPayment, setShowPayment] = useState(false);
  const clear = useCartStore((s) => s.clear);
  const items = useCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const terminalId = useAppStore((s) => s.terminalId);

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

  const handlePaymentComplete = async (pagos: Array<{ formaPago: string; monto: number; referencia?: string }>) => {
    const cartItems = useCartStore.getState().items;

    await window.api.ventas.create({
      terminalId,
      usuarioId: user?.id ?? 0,
      subtotal: useCartStore.getState().getSubtotal(),
      descuento: useCartStore.getState().getDiscountTotal(),
      iva: useCartStore.getState().getIva(),
      total: useCartStore.getState().getTotal(),
      items: cartItems.map((item) => ({
        productoId: item.productoId,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento,
        subtotal: item.subtotal,
      })),
      pagos,
    });

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

          {activeSection === "inventory" && <InventoryPage />}

          {activeSection === "clients" && <ClientsPage />}

          {activeSection === "cashcuts" && <CashCutsPage />}

          {activeSection === "reports" && <ReportsPage />}

          {activeSection === "invoices" && <InvoicesPage />}

          {activeSection === "promos" && <PromosPage />}

          {activeSection === "bitacora" && <BitacoraPage />}

          {activeSection === "settings" && <SettingsPage />}
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
