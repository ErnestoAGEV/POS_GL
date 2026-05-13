import { useState, useMemo, useCallback } from "react";
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
import { HeldSalesModal } from "../components/pos/HeldSalesModal";
import { ReprintModal } from "../components/pos/ReprintModal";
import { ReturnModal } from "../components/pos/ReturnModal";
import { ApartadoModal } from "../components/pos/ApartadoModal";
import { ApartadosPage } from "./ApartadosPage";
import { GiftCardsPage } from "./GiftCardsPage";
import { useCartStore } from "../stores/cart-store";
import { useAuthStore } from "../stores/auth-store";
import { useAppStore } from "../stores/app-store";
import { useHotkeys } from "../hooks/useHotkeys";

export function PosPage() {
  const [activeSection, setActiveSection] = useState("pos");
  const [showPayment, setShowPayment] = useState(false);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [showReprint, setShowReprint] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showApartado, setShowApartado] = useState(false);
  const clear = useCartStore((s) => s.clear);
  const items = useCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const terminalId = useAppStore((s) => s.terminalId);

  const handleHoldSale = useCallback(async () => {
    const cartItems = useCartStore.getState().items;
    if (cartItems.length === 0) return;

    await window.api.ventasEspera.hold({
      nombre: `Venta ${new Date().toLocaleTimeString()}`,
      terminalId,
      usuarioId: user?.id ?? 0,
      items: cartItems.map((item) => ({
        productoId: item.productoId,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento,
        subtotal: item.subtotal,
        tasaIva: item.tasaIva,
      })),
    });

    clear();
  }, [terminalId, user?.id, clear]);

  const hotkeys = useMemo(
    () => ({
      F1: () => {
        const input = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Escanear"]'
        );
        input?.focus();
      },
      F5: () => {
        if (items.length > 0) handleHoldSale();
      },
      F6: () => setShowHeldSales(true),
      F7: () => setShowReprint(true),
      F9: () => setShowReturn(true),
      F10: () => {
        if (items.length > 0) setShowApartado(true);
      },
      F12: () => {
        if (items.length > 0) setShowPayment(true);
      },
    }),
    [items.length, handleHoldSale]
  );

  useHotkeys(hotkeys);

  const handleRecallSale = (recalledItems: any[]) => {
    clear();
    for (const item of recalledItems) {
      useCartStore.getState().addItem({
        id: item.productoId,
        nombre: item.nombre,
        precioVenta: item.precioUnitario,
        tasaIva: item.tasaIva ?? 0.16,
      });
      if (item.cantidad > 1) {
        useCartStore.getState().updateQuantity(item.productoId, item.cantidad);
      }
    }
  };

  const handlePaymentComplete = async (pagos: Array<{ formaPago: string; monto: number; referencia?: string }>) => {
    const cartItems = useCartStore.getState().items;

    const subtotal = useCartStore.getState().getSubtotal();
    const descuento = useCartStore.getState().getDiscountTotal();
    const iva = useCartStore.getState().getIva();
    const total = useCartStore.getState().getTotal();

    const saleResult = await window.api.ventas.create({
      terminalId,
      usuarioId: user?.id ?? 0,
      subtotal,
      descuento,
      iva,
      total,
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

    // Auto-print ticket
    const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
    window.api.ticket.print({
      folio: saleResult.folio,
      fecha: new Date().toISOString(),
      sucursal: "Sucursal 1",
      terminal: `Terminal ${terminalId}`,
      cajero: user?.nombre ?? "Cajero",
      items: cartItems.map((item) => ({
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento,
        subtotal: item.subtotal,
      })),
      subtotal,
      descuento,
      iva,
      total,
      pagos: pagos.map((p) => ({ formaPago: p.formaPago, monto: p.monto })),
      cambio: totalPagado > total ? totalPagado - total : 0,
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

          {activeSection === "apartados" && <ApartadosPage />}

          {activeSection === "giftcards" && <GiftCardsPage />}

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

      <HeldSalesModal
        isOpen={showHeldSales}
        onClose={() => setShowHeldSales(false)}
        terminalId={terminalId}
        onRecall={handleRecallSale}
      />

      <ReprintModal
        isOpen={showReprint}
        onClose={() => setShowReprint(false)}
        sucursal="Sucursal 1"
        terminal={`Terminal ${terminalId}`}
        cajero={user?.nombre ?? "Cajero"}
      />

      <ReturnModal
        isOpen={showReturn}
        onClose={() => setShowReturn(false)}
        usuarioId={user?.id ?? 0}
      />

      <ApartadoModal
        isOpen={showApartado}
        onClose={() => setShowApartado(false)}
        total={useCartStore.getState().getTotal()}
        onConfirm={async (data) => {
          const cartItems = useCartStore.getState().items;
          const saleResult = await window.api.ventas.create({
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
            pagos: [{ formaPago: "efectivo", monto: data.enganche }],
          });
          await window.api.apartados.create({
            ventaId: saleResult.id,
            enganche: data.enganche,
            total: useCartStore.getState().getTotal(),
            clienteId: data.clienteId,
            fechaLimite: data.fechaLimite,
          });
          clear();
        }}
      />
    </div>
  );
}
