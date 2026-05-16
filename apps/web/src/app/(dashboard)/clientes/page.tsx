"use client";

import { useState, useEffect } from "react";
import { Users, Download, Search, Plus, Pencil, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  rfc: string | null;
  razonSocial: string | null;
  regimenFiscal: string | null;
  usoCfdi: string | null;
  domicilioFiscal: string | null;
  limiteCredito: number;
  saldoCredito: number;
  activo: boolean;
}

interface ClientForm {
  nombre: string;
  telefono: string;
  email: string;
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  usoCfdi: string;
  domicilioFiscal: string;
  limiteCredito: string;
}

const emptyForm: ClientForm = {
  nombre: "",
  telefono: "",
  email: "",
  rfc: "",
  razonSocial: "",
  regimenFiscal: "",
  usoCfdi: "G03",
  domicilioFiscal: "",
  limiteCredito: "0",
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClients();
  }, [page, search]);

  const loadClients = () => {
    setLoading(true);
    api.clientes
      .list(page, 50, search || undefined)
      .then((res) => setClientes(res.data || res))
      .catch(() => setClientes([]))
      .finally(() => setLoading(false));
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (c: Cliente) => {
    setForm({
      nombre: c.nombre,
      telefono: c.telefono || "",
      email: c.email || "",
      rfc: c.rfc || "",
      razonSocial: c.razonSocial || "",
      regimenFiscal: c.regimenFiscal || "",
      usoCfdi: c.usoCfdi || "G03",
      domicilioFiscal: c.domicilioFiscal || "",
      limiteCredito: String(c.limiteCredito),
    });
    setEditingId(c.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nombre) return;
    setSaving(true);
    try {
      const data = {
        nombre: form.nombre,
        telefono: form.telefono || undefined,
        email: form.email || undefined,
        rfc: form.rfc || undefined,
        razonSocial: form.razonSocial || undefined,
        regimenFiscal: form.regimenFiscal || undefined,
        usoCfdi: form.usoCfdi || undefined,
        domicilioFiscal: form.domicilioFiscal || undefined,
        limiteCredito: parseFloat(form.limiteCredito) || 0,
      };
      if (editingId) {
        await api.clientes.update(editingId, data);
      } else {
        await api.clientes.create(data);
      }
      setShowModal(false);
      loadClients();
    } catch {
      // handled by api client
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Desactivar cliente "${nombre}"?`)) return;
    try {
      await api.clientes.delete(id);
      loadClients();
    } catch {
      // handled by api client
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-pos-amber" />
          <h1 className="text-2xl font-bold text-pos-text">Clientes</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Nuevo Cliente
          </button>
          {clientes.length > 0 && (
            <button
              onClick={() =>
                exportToExcel(
                  clientes.map((c) => ({
                    Nombre: c.nombre,
                    Telefono: c.telefono || "",
                    Email: c.email || "",
                    RFC: c.rfc || "",
                    "Razon Social": c.razonSocial || "",
                    "Limite Credito": c.limiteCredito,
                    Saldo: c.saldoCredito,
                    Estado: c.activo ? "Activo" : "Inactivo",
                  })),
                  "clientes"
                )
              }
              className="flex items-center gap-2 px-4 py-2 bg-pos-green/20 text-pos-green rounded-lg text-sm hover:bg-pos-green/30 transition-colors cursor-pointer"
            >
              <Download size={16} />
              Excel
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted" />
          <input
            placeholder="Buscar por nombre, RFC o telefono..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full bg-pos-card border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 transition-colors cursor-pointer">Buscar</button>
        {search && (
          <button onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }} className="px-3 py-2 text-pos-muted text-sm hover:text-pos-text cursor-pointer">Limpiar</button>
        )}
      </div>

      <div className="bg-pos-card border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-pos-muted border-b border-slate-700">
              <th className="p-3 font-medium">Nombre</th>
              <th className="p-3 font-medium">Telefono</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">RFC</th>
              <th className="p-3 font-medium text-right">Limite Credito</th>
              <th className="p-3 font-medium text-right">Saldo</th>
              <th className="p-3 font-medium text-center">Estado</th>
              <th className="p-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-pos-muted text-sm">No hay clientes registrados</td></tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-text font-medium">{c.nombre}</td>
                  <td className="p-3 text-pos-muted">{c.telefono || "-"}</td>
                  <td className="p-3 text-pos-muted text-xs">{c.email || "-"}</td>
                  <td className="p-3 text-pos-muted font-mono text-xs">{c.rfc || "-"}</td>
                  <td className="p-3 text-pos-text text-right font-mono">{c.limiteCredito > 0 ? `$${c.limiteCredito.toFixed(2)}` : "-"}</td>
                  <td className="p-3 text-right font-mono">{c.saldoCredito > 0 ? <span className="text-pos-red">${c.saldoCredito.toFixed(2)}</span> : <span className="text-pos-muted">$0.00</span>}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.activo ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-pos-muted"}`}>{c.activo ? "Activo" : "Inactivo"}</span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-pos-muted hover:text-pos-blue transition-colors cursor-pointer" title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(c.id, c.nombre)} className="p-1.5 text-pos-muted hover:text-pos-red transition-colors cursor-pointer" title="Desactivar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer">Anterior</button>
        <span className="px-4 py-2 text-sm text-pos-muted">Pagina {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={clientes.length < 50} className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer">Siguiente</button>
      </div>

      {/* Modal crear/editar cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-pos-card border border-slate-700 rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-pos-text">
                {editingId ? "Editar Cliente" : "Nuevo Cliente"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-pos-muted hover:text-pos-text cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-pos-muted">Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-pos-muted">Telefono</label>
                <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-pos-muted">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1" />
              </div>

              <div className="col-span-2 border-t border-slate-700 pt-3">
                <p className="text-xs text-pos-muted font-medium mb-2">Datos Fiscales (para facturacion)</p>
              </div>
              <div>
                <label className="text-xs text-pos-muted">RFC</label>
                <input value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value.toUpperCase() })} placeholder="XAXX010101000" className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1 placeholder:text-pos-muted/40 font-mono" />
              </div>
              <div>
                <label className="text-xs text-pos-muted">Razon Social</label>
                <input value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-pos-muted">Regimen Fiscal</label>
                <select value={form.regimenFiscal} onChange={(e) => setForm({ ...form, regimenFiscal: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1">
                  <option value="">Seleccionar...</option>
                  <option value="601">601 - General de Ley</option>
                  <option value="603">603 - Personas Morales no Lucrativas</option>
                  <option value="605">605 - Sueldos y Salarios</option>
                  <option value="606">606 - Arrendamiento</option>
                  <option value="612">612 - Personas Fisicas con Act. Empresarial</option>
                  <option value="616">616 - Sin Obligaciones Fiscales</option>
                  <option value="621">621 - Incorporacion Fiscal</option>
                  <option value="625">625 - Regimen de Act. Agricolas</option>
                  <option value="626">626 - RESICO</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-pos-muted">Uso CFDI</label>
                <select value={form.usoCfdi} onChange={(e) => setForm({ ...form, usoCfdi: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1">
                  <option value="G01">G01 - Adquisicion de mercancias</option>
                  <option value="G03">G03 - Gastos en general</option>
                  <option value="I01">I01 - Construcciones</option>
                  <option value="I04">I04 - Equipo de computo</option>
                  <option value="P01">P01 - Por definir</option>
                  <option value="S01">S01 - Sin efectos fiscales</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-pos-muted">Domicilio Fiscal (CP)</label>
                <input value={form.domicilioFiscal} onChange={(e) => setForm({ ...form, domicilioFiscal: e.target.value })} placeholder="06600" className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1 placeholder:text-pos-muted/40 font-mono" />
              </div>
              <div>
                <label className="text-xs text-pos-muted">Limite de Credito</label>
                <input type="number" step="0.01" value={form.limiteCredito} onChange={(e) => setForm({ ...form, limiteCredito: e.target.value })} className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-pos-muted hover:text-pos-text cursor-pointer">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.nombre} className="px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 disabled:opacity-50 transition-colors cursor-pointer">
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
