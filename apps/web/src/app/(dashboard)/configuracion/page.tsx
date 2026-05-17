"use client";

import { useState, useEffect } from "react";
import { Settings, Save, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

interface ConfigEntry {
  valor: string;
  descripcion: string | null;
}

const SECTIONS = [
  {
    title: "Datos del Negocio",
    keys: [
      "negocio.nombre",
      "negocio.rfc",
      "negocio.razonSocial",
      "negocio.regimenFiscal",
      "negocio.codigoPostal",
      "negocio.direccion",
      "negocio.telefono",
      "negocio.email",
    ],
  },
  {
    title: "Configuracion de Ticket",
    keys: ["ticket.encabezado", "ticket.pie", "ticket.mostrarLogo"],
  },
  {
    title: "Ventas",
    keys: [
      "venta.tasaIvaDefault",
      "venta.folioSerie",
      "venta.permitirDescuento",
      "venta.descuentoMaximo",
    ],
  },
  {
    title: "Stock",
    keys: ["stock.alertaEmail", "stock.minimoDefault"],
  },
];

const LABELS: Record<string, string> = {
  "negocio.nombre": "Nombre del negocio",
  "negocio.rfc": "RFC",
  "negocio.razonSocial": "Razon social",
  "negocio.regimenFiscal": "Regimen fiscal",
  "negocio.codigoPostal": "Codigo postal",
  "negocio.direccion": "Direccion",
  "negocio.telefono": "Telefono",
  "negocio.email": "Email",
  "ticket.encabezado": "Encabezado del ticket",
  "ticket.pie": "Pie del ticket",
  "ticket.mostrarLogo": "Mostrar logo",
  "venta.tasaIvaDefault": "Tasa IVA default",
  "venta.folioSerie": "Serie de folio",
  "venta.permitirDescuento": "Permitir descuentos",
  "venta.descuentoMaximo": "Descuento maximo (%)",
  "stock.alertaEmail": "Alertas por email",
  "stock.minimoDefault": "Stock minimo default",
};

const BOOLEAN_KEYS = ["ticket.mostrarLogo", "venta.permitirDescuento", "stock.alertaEmail"];

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<Record<string, ConfigEntry>>({});
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.configuracion.get();
      setConfig(data);
      const formData: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        formData[k] = v.valor;
      }
      setForm(formData);
    } catch {
      setConfig({});
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await api.configuracion.update(form);
      setMessage("Configuracion guardada correctamente");
      setTimeout(() => setMessage(""), 3000);
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    }
    setSaving(false);
  };

  const handleSeed = async () => {
    try {
      await api.configuracion.seed();
      await loadConfig();
      setMessage("Valores por defecto inicializados");
      setTimeout(() => setMessage(""), 3000);
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    }
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-pos-muted">Cargando configuracion...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-pos-blue" />
          <h1 className="text-2xl font-bold text-pos-text">Configuracion del Sistema</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            className="flex items-center gap-2 px-3 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            Inicializar Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Save size={16} />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${message.startsWith("Error") ? "bg-pos-red/20 text-pos-red" : "bg-pos-green/20 text-pos-green"}`}>
          {message}
        </div>
      )}

      {SECTIONS.map((section) => (
        <div key={section.title} className="bg-pos-card border border-slate-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-pos-text mb-4 border-b border-slate-700 pb-2">
            {section.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.keys.map((key) => (
              <div key={key}>
                <label className="text-xs text-pos-muted block mb-1">{LABELS[key] || key}</label>
                {BOOLEAN_KEYS.includes(key) ? (
                  <select
                    value={form[key] || "false"}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm cursor-pointer"
                  >
                    <option value="true">Si</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form[key] || ""}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm"
                    placeholder={config[key]?.descripcion || ""}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
