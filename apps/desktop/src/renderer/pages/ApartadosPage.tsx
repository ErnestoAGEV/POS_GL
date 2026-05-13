import { useState, useEffect, useCallback } from "react";
import { Package, Plus, X, DollarSign, Ban, Eye } from "lucide-react";

interface Apartado {
  id: number;
  venta_id: number;
  cliente_id: number | null;
  enganche: number;
  saldo_pendiente: number;
  total: number;
  estado: string;
  fecha_limite: string | null;
  fecha: string;
  clienteNombre: string | null;
  ventaFolio: string;
}

interface AbonoRow {
  id: number;
  monto: number;
  forma_pago: string;
  fecha: string;
}

const ESTADO_STYLES: Record<string, string> = {
  activo: "bg-amber-500/20 text-pos-amber",
  liquidado: "bg-green-500/20 text-pos-green",
  cancelado: "bg-red-500/20 text-pos-red",
};

export function ApartadosPage() {
  const [apartados, setApartados] = useState<Apartado[]>([]);
  const [selected, setSelected] = useState<(Apartado & { abonos: AbonoRow[] }) | null>(null);
  const [showAbono, setShowAbono] = useState(false);
  const [abonoMonto, setAbonoMonto] = useState("");
  const [abonoFormaPago, setAbonoFormaPago] = useState("efectivo");

  const load = useCallback(async () => {
    const rows = await window.api.apartados.list();
    setApartados(rows);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = async (id: number) => {
    const detail = await window.api.apartados.get(id);
    setSelected(detail);
  };

  const handleAbono = async () => {
    if (!selected || !abonoMonto) return;
    const result = await window.api.apartados.abono(selected.id, {
      monto: parseFloat(abonoMonto),
      formaPago: abonoFormaPago,
    });
    setShowAbono(false);
    setAbonoMonto("");
    if (result.liquidado) {
      setSelected(null);
    } else {
      handleSelect(selected.id);
    }
    load();
  };

  const handleCancel = async () => {
    if (!selected) return;
    await window.api.apartados.cancelar(selected.id);
    setSelected(null);
    load();
  };

  const pagado = selected
    ? selected.total - selected.saldo_pendiente
    : 0;
  const porcentaje = selected
    ? ((pagado / selected.total) * 100).toFixed(0)
    : "0";

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center gap-2">
        <Package size={20} className="text-pos-amber" />
        <h2 className="text-lg font-semibold text-pos-text">Apartados</h2>
        <span className="text-sm text-pos-muted">
          ({apartados.filter((a) => a.estado === "activo").length} activos)
        </span>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* List */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-pos-muted border-b border-slate-700">
                <th className="pb-2 font-medium">Folio</th>
                <th className="pb-2 font-medium">Cliente</th>
                <th className="pb-2 font-medium text-right">Total</th>
                <th className="pb-2 font-medium text-right">Pendiente</th>
                <th className="pb-2 font-medium text-center">Estado</th>
                <th className="pb-2 font-medium">Fecha</th>
                <th className="pb-2 font-medium text-center">Ver</th>
              </tr>
            </thead>
            <tbody>
              {apartados.map((a) => (
                <tr
                  key={a.id}
                  className={`border-b border-slate-800 text-sm hover:bg-pos-active/50 transition-colors cursor-pointer ${
                    selected?.id === a.id ? "bg-pos-active/50" : ""
                  }`}
                  onClick={() => handleSelect(a.id)}
                >
                  <td className="py-2.5 text-pos-text font-mono text-xs">{a.ventaFolio}</td>
                  <td className="py-2.5 text-pos-text">{a.clienteNombre || "Sin cliente"}</td>
                  <td className="py-2.5 text-pos-text text-right font-mono">${a.total.toFixed(2)}</td>
                  <td className="py-2.5 text-pos-amber text-right font-mono">${a.saldo_pendiente.toFixed(2)}</td>
                  <td className="py-2.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[a.estado] || ""}`}>
                      {a.estado}
                    </span>
                  </td>
                  <td className="py-2.5 text-pos-muted text-xs">{new Date(a.fecha).toLocaleDateString()}</td>
                  <td className="py-2.5 text-center">
                    <button className="p-1 rounded hover:bg-pos-active transition-colors cursor-pointer">
                      <Eye size={14} className="text-pos-muted" />
                    </button>
                  </td>
                </tr>
              ))}
              {apartados.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-pos-muted text-sm">
                    No hay apartados registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 bg-pos-card border border-slate-700 rounded-xl p-4 flex flex-col gap-3 overflow-auto">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-pos-text">{selected.ventaFolio}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[selected.estado]}`}>
                {selected.estado}
              </span>
            </div>

            <div className="text-xs text-pos-muted">
              {selected.clienteNombre && <div>Cliente: {selected.clienteNombre}</div>}
              <div>Fecha: {new Date(selected.fecha).toLocaleDateString()}</div>
              {selected.fecha_limite && (
                <div>Limite: {new Date(selected.fecha_limite).toLocaleDateString()}</div>
              )}
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-pos-muted">Pagado: ${pagado.toFixed(2)}</span>
                <span className="text-pos-amber">{porcentaje}%</span>
              </div>
              <div className="h-2 bg-pos-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-pos-amber rounded-full transition-all"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-pos-muted">Pendiente:</span>
                <span className="text-pos-amber font-mono font-semibold">
                  ${selected.saldo_pendiente.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Abonos history */}
            <div>
              <div className="text-xs text-pos-muted font-medium mb-1">Abonos</div>
              <div className="space-y-1 max-h-40 overflow-auto">
                {selected.abonos?.map((abono: AbonoRow) => (
                  <div key={abono.id} className="flex justify-between text-xs bg-pos-bg rounded-lg px-2 py-1.5">
                    <div>
                      <span className="text-pos-text">{abono.forma_pago}</span>
                      <span className="text-pos-muted ml-2">{new Date(abono.fecha).toLocaleDateString()}</span>
                    </div>
                    <span className="text-pos-green font-mono">+${abono.monto.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {selected.estado === "activo" && (
              <div className="space-y-2 mt-auto pt-2">
                {showAbono ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted text-sm">$</span>
                      <input
                        type="number"
                        value={abonoMonto}
                        onChange={(e) => setAbonoMonto(e.target.value)}
                        placeholder="Monto del abono"
                        className="w-full bg-pos-bg border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-pos-text font-mono focus:border-pos-green focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <select
                      value={abonoFormaPago}
                      onChange={(e) => setAbonoFormaPago(e.target.value)}
                      className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text focus:border-pos-green focus:outline-none"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAbono(false)}
                        className="flex-1 px-3 py-2 text-xs text-pos-muted hover:text-pos-text cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAbono}
                        disabled={!abonoMonto || parseFloat(abonoMonto) <= 0}
                        className="flex-1 px-3 py-2 bg-pos-green text-white rounded-lg text-xs font-medium hover:bg-green-600 cursor-pointer disabled:opacity-50"
                      >
                        Registrar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowAbono(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors cursor-pointer"
                    >
                      <DollarSign size={16} />
                      Registrar Abono
                    </button>
                    <button
                      onClick={handleCancel}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-pos-red/20 text-pos-red rounded-lg text-sm hover:bg-pos-red/30 transition-colors cursor-pointer"
                    >
                      <Ban size={16} />
                      Cancelar Apartado
                    </button>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => setSelected(null)}
              className="text-xs text-pos-muted hover:text-pos-text text-center cursor-pointer mt-1"
            >
              Cerrar detalle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
