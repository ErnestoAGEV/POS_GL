import { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  corteId: number;
}

export function CashMovementModal({ isOpen, onClose, onSaved, corteId }: Props) {
  const [tipo, setTipo] = useState<"entrada" | "salida">("entrada");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTipo("entrada");
      setMonto("");
      setConcepto("");
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!monto || !concepto.trim()) return;
    setSaving(true);

    await window.api.cortes.movimiento(corteId, {
      tipo,
      monto: parseFloat(monto),
      concepto: concepto.trim(),
    });

    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Movimiento de Caja">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setTipo("entrada")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
              tipo === "entrada"
                ? "bg-green-500/20 text-pos-green border border-green-500/50"
                : "bg-pos-bg text-pos-muted border border-slate-700"
            }`}
          >
            Entrada
          </button>
          <button
            onClick={() => setTipo("salida")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
              tipo === "salida"
                ? "bg-red-500/20 text-pos-red border border-red-500/50"
                : "bg-pos-bg text-pos-muted border border-slate-700"
            }`}
          >
            Salida
          </button>
        </div>

        <Input
          label="Monto"
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="0.00"
        />

        <Input
          label="Concepto"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="Ej: Cambio, retiro, fondo..."
        />
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving || !monto || !concepto.trim()}
        >
          {saving ? "Guardando..." : "Registrar"}
        </Button>
      </div>
    </Modal>
  );
}
