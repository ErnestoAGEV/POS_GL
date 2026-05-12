import { useState, useEffect } from "react";
import {
  Scissors,
  PlusCircle,
  MinusCircle,
  Clock,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { OpenShiftModal } from "../components/cashcuts/OpenShiftModal";
import { CashMovementModal } from "../components/cashcuts/CashMovementModal";
import { CloseShiftModal } from "../components/cashcuts/CloseShiftModal";
import { useAppStore } from "../stores/app-store";
import { formatCurrency, formatDate, formatTime } from "../lib/format";

export function CashCutsPage() {
  const terminalId = useAppStore((s) => s.terminalId);
  const [activeCorte, setActiveCorte] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showOpen, setShowOpen] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [showClose, setShowClose] = useState(false);

  useEffect(() => {
    loadData();
  }, [terminalId]);

  const loadData = async () => {
    const activo = await window.api.cortes.activo(terminalId);
    setActiveCorte(activo);

    const list = await window.api.cortes.list(terminalId);
    setHistory(list.filter((c: any) => c.fechaCierre));
  };

  const hasActiveShift = !!activeCorte;

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-pos-text text-xl font-semibold flex items-center gap-2">
          <Scissors size={22} />
          Cortes de Caja
        </h1>
        <div className="flex gap-2">
          {!hasActiveShift ? (
            <Button variant="primary" onClick={() => setShowOpen(true)}>
              <Clock size={16} className="mr-1" />
              Abrir Turno
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setShowMovement(true)}>
                <ArrowUpDown size={16} className="mr-1" />
                Movimiento
              </Button>
              <Button variant="danger" onClick={() => setShowClose(true)}>
                <Scissors size={16} className="mr-1" />
                Cerrar Corte
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Active Shift Card */}
      {hasActiveShift && (
        <div className="bg-pos-card border border-slate-700 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-pos-text font-semibold">Turno Activo</h2>
            <span className="text-xs bg-green-500/20 text-pos-green px-2 py-1 rounded-full">
              Abierto
            </span>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-pos-bg rounded-lg p-3">
              <p className="text-pos-muted text-xs">Apertura</p>
              <p className="text-pos-text font-medium mt-1 text-sm">
                {activeCorte.fechaApertura
                  ? `${formatDate(activeCorte.fechaApertura)} ${formatTime(activeCorte.fechaApertura)}`
                  : "\u2014"}
              </p>
            </div>
            <div className="bg-pos-bg rounded-lg p-3">
              <p className="text-pos-muted text-xs">Efectivo Inicial</p>
              <p className="text-pos-text font-medium mt-1 text-sm tabular-nums">
                {formatCurrency(activeCorte.efectivoInicial)}
              </p>
            </div>
            <div className="bg-pos-bg rounded-lg p-3">
              <p className="text-pos-muted text-xs">Entradas</p>
              <p className="text-pos-green font-medium mt-1 text-sm tabular-nums">
                {formatCurrency(
                  (activeCorte.movimientos || [])
                    .filter((m: any) => m.tipo === "entrada")
                    .reduce((s: number, m: any) => s + m.monto, 0)
                )}
              </p>
            </div>
            <div className="bg-pos-bg rounded-lg p-3">
              <p className="text-pos-muted text-xs">Salidas</p>
              <p className="text-pos-red font-medium mt-1 text-sm tabular-nums">
                {formatCurrency(
                  (activeCorte.movimientos || [])
                    .filter((m: any) => m.tipo === "salida")
                    .reduce((s: number, m: any) => s + m.monto, 0)
                )}
              </p>
            </div>
          </div>

          {/* Movements list */}
          {activeCorte.movimientos && activeCorte.movimientos.length > 0 && (
            <div>
              <p className="text-pos-muted text-xs uppercase tracking-wider mb-2">
                Movimientos
              </p>
              <div className="space-y-1">
                {activeCorte.movimientos.map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-pos-bg rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {m.tipo === "entrada" ? (
                        <PlusCircle size={14} className="text-pos-green" />
                      ) : (
                        <MinusCircle size={14} className="text-pos-red" />
                      )}
                      <span className="text-pos-text text-sm">{m.concepto}</span>
                    </div>
                    <span
                      className={`text-sm font-medium tabular-nums ${
                        m.tipo === "entrada" ? "text-pos-green" : "text-pos-red"
                      }`}
                    >
                      {m.tipo === "entrada" ? "+" : "-"}
                      {formatCurrency(m.monto)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="text-pos-muted text-xs uppercase tracking-wider mb-3">
          Historial de Cortes
        </h2>
        {history.length === 0 ? (
          <div className="text-center text-pos-muted py-8">
            <Scissors size={48} className="mx-auto mb-2 opacity-30" />
            <p>Sin cortes registrados</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-pos-muted text-xs uppercase tracking-wider border-b border-slate-700">
                <th className="text-left py-2 px-3">Fecha</th>
                <th className="text-center py-2 px-3">Tipo</th>
                <th className="text-right py-2 px-3">Ventas</th>
                <th className="text-right py-2 px-3">Efectivo Sistema</th>
                <th className="text-right py-2 px-3">Declarado</th>
                <th className="text-right py-2 px-3">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {history.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-800 hover:bg-pos-active/30 transition-colors"
                >
                  <td className="py-2 px-3 text-pos-text text-sm">
                    {c.fechaCierre
                      ? formatDate(c.fechaCierre)
                      : "\u2014"}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        c.tipo === "final"
                          ? "bg-amber-500/20 text-pos-amber"
                          : "bg-blue-500/20 text-pos-blue"
                      }`}
                    >
                      {c.tipo}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-pos-text tabular-nums">
                    {formatCurrency(c.totalVentas)}
                  </td>
                  <td className="py-2 px-3 text-right text-pos-text tabular-nums">
                    {formatCurrency(c.efectivoSistema)}
                  </td>
                  <td className="py-2 px-3 text-right text-pos-text tabular-nums">
                    {formatCurrency(c.efectivoDeclarado ?? 0)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    <span
                      className={
                        (c.diferencia ?? 0) === 0
                          ? "text-pos-green"
                          : (c.diferencia ?? 0) > 0
                          ? "text-pos-blue"
                          : "text-pos-red"
                      }
                    >
                      {(c.diferencia ?? 0) > 0 ? "+" : ""}
                      {formatCurrency(c.diferencia ?? 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <OpenShiftModal
        isOpen={showOpen}
        onClose={() => setShowOpen(false)}
        onOpened={loadData}
        terminalId={terminalId}
      />

      {hasActiveShift && (
        <>
          <CashMovementModal
            isOpen={showMovement}
            onClose={() => setShowMovement(false)}
            onSaved={loadData}
            corteId={activeCorte.id}
          />

          <CloseShiftModal
            isOpen={showClose}
            onClose={() => setShowClose(false)}
            onClosed={loadData}
            corteId={activeCorte.id}
            efectivoSistema={activeCorte.efectivoInicial +
              (activeCorte.movimientos || [])
                .filter((m: any) => m.tipo === "entrada")
                .reduce((s: number, m: any) => s + m.monto, 0) -
              (activeCorte.movimientos || [])
                .filter((m: any) => m.tipo === "salida")
                .reduce((s: number, m: any) => s + m.monto, 0)}
            totalVentas={0}
            totalEfectivo={0}
            totalTarjeta={0}
            totalTransferencia={0}
            totalOtros={0}
          />
        </>
      )}
    </div>
  );
}
