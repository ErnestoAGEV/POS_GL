import { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

interface ClientData {
  id?: number;
  nombre: string;
  telefono: string;
  email: string;
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  usoCfdi: string;
  domicilioFiscal: string;
  limiteCredito: number;
}

const EMPTY: ClientData = {
  nombre: "",
  telefono: "",
  email: "",
  rfc: "",
  razonSocial: "",
  regimenFiscal: "",
  usoCfdi: "",
  domicilioFiscal: "",
  limiteCredito: 0,
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  client?: any;
}

export function ClientFormModal({ isOpen, onClose, onSaved, client }: Props) {
  const [form, setForm] = useState<ClientData>(EMPTY);
  const [saving, setSaving] = useState(false);

  const isEdit = !!client;

  useEffect(() => {
    if (isOpen) {
      if (client) {
        setForm({
          id: client.id,
          nombre: client.nombre || "",
          telefono: client.telefono || "",
          email: client.email || "",
          rfc: client.rfc || "",
          razonSocial: client.razonSocial || "",
          regimenFiscal: client.regimenFiscal || "",
          usoCfdi: client.usoCfdi || "",
          domicilioFiscal: client.domicilioFiscal || "",
          limiteCredito: client.limiteCredito || 0,
        });
      } else {
        setForm(EMPTY);
      }
    }
  }, [isOpen, client]);

  const set = (field: keyof ClientData, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);

    if (isEdit && form.id) {
      await window.api.clients.update(form.id, {
        nombre: form.nombre,
        telefono: form.telefono || undefined,
        email: form.email || undefined,
        rfc: form.rfc || undefined,
        razonSocial: form.razonSocial || undefined,
        regimenFiscal: form.regimenFiscal || undefined,
        usoCfdi: form.usoCfdi || undefined,
        domicilioFiscal: form.domicilioFiscal || undefined,
        limiteCredito: form.limiteCredito,
      });
    } else {
      await window.api.clients.create({
        nombre: form.nombre,
        telefono: form.telefono || undefined,
        email: form.email || undefined,
        rfc: form.rfc || undefined,
        razonSocial: form.razonSocial || undefined,
        regimenFiscal: form.regimenFiscal || undefined,
        usoCfdi: form.usoCfdi || undefined,
        domicilioFiscal: form.domicilioFiscal || undefined,
        limiteCredito: form.limiteCredito,
      });
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Editar Cliente" : "Nuevo Cliente"}
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Nombre *"
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>

          <Input
            label="Telefono"
            value={form.telefono}
            onChange={(e) => set("telefono", e.target.value)}
            placeholder="55 1234 5678"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="cliente@email.com"
          />
        </div>

        <div className="border-t border-slate-700 pt-4">
          <p className="text-pos-muted text-xs uppercase tracking-wider mb-3">
            Datos Fiscales
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="RFC"
              value={form.rfc}
              onChange={(e) => set("rfc", e.target.value.toUpperCase())}
              placeholder="XAXX010101000"
            />
            <Input
              label="Razon Social"
              value={form.razonSocial}
              onChange={(e) => set("razonSocial", e.target.value)}
              placeholder="Razon social"
            />
            <Input
              label="Regimen Fiscal"
              value={form.regimenFiscal}
              onChange={(e) => set("regimenFiscal", e.target.value)}
              placeholder="601 - General de ley"
            />
            <Input
              label="Uso CFDI"
              value={form.usoCfdi}
              onChange={(e) => set("usoCfdi", e.target.value)}
              placeholder="G03 - Gastos en general"
            />
            <div className="col-span-2">
              <Input
                label="Domicilio Fiscal (CP)"
                value={form.domicilioFiscal}
                onChange={(e) => set("domicilioFiscal", e.target.value)}
                placeholder="06600"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4">
          <Input
            label="Limite de Credito"
            type="number"
            value={String(form.limiteCredito)}
            onChange={(e) => set("limiteCredito", parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={saving || !form.nombre.trim()}
        >
          {saving ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Cliente"}
        </Button>
      </div>
    </Modal>
  );
}
