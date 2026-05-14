"use client";

import { useState, useEffect } from "react";
import { Users, Download, Search } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  email: string | null;
  rfc: string | null;
  limiteCredito: number;
  saldoCredito: number;
  activo: boolean;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    setLoading(true);
    api.clientes
      .list(page, 50, search || undefined)
      .then((res) => setClientes(res.data || res))
      .catch(() => setClientes([]))
      .finally(() => setLoading(false));
  }, [page, search]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-pos-amber" />
          <h1 className="text-2xl font-bold text-pos-text">Clientes</h1>
        </div>
        {clientes.length > 0 && (
          <button
            onClick={() =>
              exportToExcel(
                clientes.map((c) => ({
                  Nombre: c.nombre,
                  Telefono: c.telefono || "",
                  Email: c.email || "",
                  RFC: c.rfc || "",
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
            Exportar Excel
          </button>
        )}
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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-pos-muted text-sm">No hay clientes registrados</td></tr>
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
    </div>
  );
}
