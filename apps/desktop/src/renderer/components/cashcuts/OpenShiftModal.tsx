import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpened: () => void;
  terminalId: number;
}

export function OpenShiftModal({ isOpen, onClose, onOpened, terminalId }: Props) {
  const [efectivoInicial, setEfectivoInicial] = useState("0");
  const [saving, setSaving] = useState(false);

  const handleOpen = async () => {
    setSaving(true);
    const result = await window.api.cortes.abrir({
      terminalId,
      efectivoInicial: parseFloat(efectivoInicial) || 0,
    });

    setSaving(false);

    if (result.error) {
      return;
    }

    setEfectivoInicial("0");
    onOpened();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Abrir Turno">
      <div className="space-y-4">
        <p className="text-pos-muted text-sm">
          Ingresa el monto inicial de efectivo en caja para comenzar el turno.
        </p>
        <Input
          label="Efectivo Inicial"
          type="number"
          value={efectivoInicial}
          onChange={(e) => setEfectivoInicial(e.target.value)}
          placeholder="0.00"
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleOpen} disabled={saving}>
          {saving ? "Abriendo..." : "Abrir Turno"}
        </Button>
      </div>
    </Modal>
  );
}
