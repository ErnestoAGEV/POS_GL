import { useState, useEffect, useCallback } from "react";
import { CreditCard, Plus, DollarSign, Search, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface GiftCard {
  id: number;
  codigo: string;
  saldo: number;
  cliente_id: number | null;
  activa: number;
  clienteNombre: string | null;
}

interface Movimiento {
  id: number;
  tipo: string;
  monto: number;
  venta_id: number | null;
  fecha: string;
}

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "GC-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createSaldo, setCreateSaldo] = useState("");
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [showCargar, setShowCargar] = useState(false);
  const [cargarMonto, setCargarMonto] = useState("");
  const [balanceSearch, setBalanceSearch] = useState("");
  const [balanceResult, setBalanceResult] = useState<{ codigo: string; saldo: number } | null>(null);

  const load = useCallback(async () => {
    const rows = await window.api.tarjetas.list();
    setCards(rows);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!createSaldo) return;
    const codigo = generateCode();
    await window.api.tarjetas.create({
      codigo,
      saldo: parseFloat(createSaldo),
    });
    setShowCreate(false);
    setCreateSaldo("");
    load();
  };

  const handleSelect = async (card: GiftCard) => {
    setSelectedCard(card);
    const movs = await window.api.tarjetas.movimientos(card.id);
    setMovimientos(movs);
  };

  const handleCargar = async () => {
    if (!selectedCard || !cargarMonto) return;
    await window.api.tarjetas.cargar(selectedCard.id, parseFloat(cargarMonto));
    setShowCargar(false);
    setCargarMonto("");
    load();
    handleSelect({ ...selectedCard, saldo: selectedCard.saldo + parseFloat(cargarMonto) });
  };

  const handleBalanceSearch = async () => {
    if (!balanceSearch.trim()) return;
    const result = await window.api.tarjetas.balance(balanceSearch);
    if (result.error) {
      setBalanceResult(null);
    } else {
      setBalanceResult(result);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard size={20} className="text-pos-blue" />
          <h2 className="text-lg font-semibold text-pos-text">Tarjetas de Regalo</h2>
          <span className="text-sm text-pos-muted">({cards.length})</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          Nueva Tarjeta
        </button>
      </div>

      {/* Balance check */}
      <div className="bg-pos-card border border-slate-700 rounded-xl p-3 flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs text-pos-muted mb-1">Consultar saldo</label>
          <input
            value={balanceSearch}
            onChange={(e) => setBalanceSearch(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleBalanceSearch()}
            placeholder="Codigo de tarjeta: GC-XXXXXXXX"
            className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-sm text-pos-text font-mono focus:border-pos-blue focus:outline-none"
          />
        </div>
        <button
          onClick={handleBalanceSearch}
          className="px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-blue-600 transition-colors cursor-pointer"
        >
          <Search size={16} />
        </button>
        {balanceResult && (
          <div className="bg-pos-bg border border-slate-700 rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-pos-muted">{balanceResult.codigo}</div>
            <div className="text-lg font-bold text-pos-green font-mono">${balanceResult.saldo.toFixed(2)}</div>
          </div>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-pos-card border border-slate-700 rounded-xl p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-pos-muted mb-1">Saldo inicial</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted">$</span>
              <input
                type="number"
                value={createSaldo}
                onChange={(e) => setCreateSaldo(e.target.value)}
                placeholder="0.00"
                className="w-full bg-pos-bg border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-pos-text font-mono focus:border-pos-green focus:outline-none"
                autoFocus
              />
            </div>
          </div>
          <button
            onClick={() => setShowCreate(false)}
            className="px-4 py-2 text-sm text-pos-muted hover:text-pos-text cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!createSaldo || parseFloat(createSaldo) <= 0}
            className="px-4 py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-green-600 cursor-pointer disabled:opacity-50"
          >
            Crear Tarjeta
          </button>
        </div>
      )}

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Cards list */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-3">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleSelect(card)}
                className={`bg-pos-card border rounded-xl p-4 text-left transition-colors cursor-pointer ${
                  selectedCard?.id === card.id
                    ? "border-pos-blue"
                    : "border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-mono text-pos-text">{card.codigo}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      card.activa ? "bg-green-500/20 text-pos-green" : "bg-slate-700 text-pos-muted"
                    }`}
                  >
                    {card.activa ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <div className="text-2xl font-bold text-pos-green font-mono">${card.saldo.toFixed(2)}</div>
                {card.clienteNombre && (
                  <div className="text-xs text-pos-muted mt-1">{card.clienteNombre}</div>
                )}
              </button>
            ))}
          </div>
          {cards.length === 0 && (
            <div className="text-center text-pos-muted py-12 text-sm">
              No hay tarjetas de regalo
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedCard && (
          <div className="w-72 bg-pos-card border border-slate-700 rounded-xl p-4 flex flex-col gap-3 overflow-auto">
            <div className="text-center">
              <div className="text-sm font-mono text-pos-muted">{selectedCard.codigo}</div>
              <div className="text-3xl font-bold text-pos-green font-mono mt-1">
                ${selectedCard.saldo.toFixed(2)}
              </div>
            </div>

            {showCargar ? (
              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted text-sm">$</span>
                  <input
                    type="number"
                    value={cargarMonto}
                    onChange={(e) => setCargarMonto(e.target.value)}
                    placeholder="Monto a cargar"
                    className="w-full bg-pos-bg border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-pos-text font-mono focus:border-pos-green focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCargar(false)}
                    className="flex-1 px-3 py-2 text-xs text-pos-muted hover:text-pos-text cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCargar}
                    disabled={!cargarMonto || parseFloat(cargarMonto) <= 0}
                    className="flex-1 px-3 py-2 bg-pos-green text-white rounded-lg text-xs font-medium hover:bg-green-600 cursor-pointer disabled:opacity-50"
                  >
                    Cargar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCargar(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors cursor-pointer"
              >
                <DollarSign size={16} />
                Recargar
              </button>
            )}

            <div>
              <div className="text-xs text-pos-muted font-medium mb-1">Movimientos</div>
              <div className="space-y-1 max-h-60 overflow-auto">
                {movimientos.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs bg-pos-bg rounded-lg px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      {m.tipo === "carga" ? (
                        <ArrowUpCircle size={12} className="text-pos-green" />
                      ) : (
                        <ArrowDownCircle size={12} className="text-pos-red" />
                      )}
                      <span className="text-pos-muted">{new Date(m.fecha).toLocaleDateString()}</span>
                    </div>
                    <span className={`font-mono ${m.tipo === "carga" ? "text-pos-green" : "text-pos-red"}`}>
                      {m.tipo === "carga" ? "+" : "-"}${m.monto.toFixed(2)}
                    </span>
                  </div>
                ))}
                {movimientos.length === 0 && (
                  <div className="text-xs text-pos-muted text-center py-4">Sin movimientos</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
