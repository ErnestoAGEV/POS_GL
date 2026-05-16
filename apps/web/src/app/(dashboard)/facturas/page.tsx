"use client";

import { useState, useEffect } from "react";
import { FileText, Download, AlertTriangle, FileCode2, FileDown } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Factura {
  id: number;
  uuidFiscal: string | null;
  clienteId: number | null;
  tipo: string;
  estado: string;
  total: number;
  serieSat: string | null;
  folioSat: string | null;
  fecha: string;
}

const ESTADO_STYLES: Record<string, string> = {
  timbrada: "bg-green-500/20 text-green-400",
  cancelada: "bg-pos-red/20 text-pos-red",
};

const TIPO_LABELS: Record<string, string> = {
  individual: "Individual",
  global: "Global",
  nota_credito: "Nota Credito",
  complemento: "Complemento",
};

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");

  useEffect(() => {
    loadFacturas();
  }, [page, filtroEstado]);

  const loadFacturas = () => {
    setLoading(true);
    api.facturas
      .list(page, 50, filtroEstado || undefined)
      .then((res) => setFacturas(res.data || []))
      .catch(() => setFacturas([]))
      .finally(() => setLoading(false));
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("es-MX");

  const truncUuid = (uuid: string | null) =>
    uuid ? `${uuid.substring(0, 8)}...` : "-";

  return (
    <div className="p-6 space-y-4">
      <div className="bg-pos-amber/10 border border-pos-amber/30 rounded-xl p-3 flex items-center gap-3">
        <AlertTriangle size={18} className="text-pos-amber flex-shrink-0" />
        <p className="text-pos-amber text-sm">
          Modulo de facturacion en modo simulacion. Los UUID son generados localmente, sin timbrado SAT real.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-pos-blue" />
          <h1 className="text-2xl font-bold text-pos-text">Facturas</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filtroEstado}
            onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
            className="bg-pos-card border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="timbrada">Timbradas</option>
            <option value="cancelada">Canceladas</option>
          </select>
          {facturas.length > 0 && (
            <button
              onClick={() =>
                exportToExcel(
                  facturas.map((f) => ({
                    ID: f.id,
                    "UUID Fiscal": f.uuidFiscal || "",
                    "Cliente ID": f.clienteId ?? "",
                    Tipo: TIPO_LABELS[f.tipo] || f.tipo,
                    Total: f.total,
                    Estado: f.estado,
                    Serie: f.serieSat || "",
                    Folio: f.folioSat || "",
                    Fecha: fmtDate(f.fecha),
                  })),
                  "facturas"
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

      <div className="bg-pos-card border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-pos-muted border-b border-slate-700">
              <th className="p-3 font-medium">ID</th>
              <th className="p-3 font-medium">UUID Fiscal</th>
              <th className="p-3 font-medium">Cliente</th>
              <th className="p-3 font-medium">Tipo</th>
              <th className="p-3 font-medium text-right">Total</th>
              <th className="p-3 font-medium text-center">Estado</th>
              <th className="p-3 font-medium">Fecha</th>
              <th className="p-3 font-medium text-center">Descargar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-pos-muted text-sm">Cargando...</td></tr>
            ) : facturas.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-pos-muted text-sm">No hay facturas</td></tr>
            ) : (
              facturas.map((f) => (
                <tr key={f.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-muted font-mono">#{f.id}</td>
                  <td className="p-3 text-pos-muted font-mono text-xs" title={f.uuidFiscal || ""}>{truncUuid(f.uuidFiscal)}</td>
                  <td className="p-3 text-pos-muted">{f.clienteId ? `#${f.clienteId}` : "-"}</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-pos-blue/20 text-pos-blue rounded text-xs">{TIPO_LABELS[f.tipo] || f.tipo}</span></td>
                  <td className="p-3 text-pos-text text-right font-mono font-medium">${f.total.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLES[f.estado] || "bg-slate-700 text-pos-muted"}`}>
                      {f.estado}
                    </span>
                  </td>
                  <td className="p-3 text-pos-muted text-xs">{fmtDate(f.fecha)}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/facturas/${f.id}/xml`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-pos-muted hover:text-pos-green transition-colors"
                        title="Descargar XML"
                      >
                        <FileCode2 size={15} />
                      </a>
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/facturas/${f.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-pos-muted hover:text-pos-blue transition-colors"
                        title="Ver PDF"
                      >
                        <FileDown size={15} />
                      </a>
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
        <button onClick={() => setPage((p) => p + 1)} disabled={facturas.length < 50} className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer">Siguiente</button>
      </div>
    </div>
  );
}
