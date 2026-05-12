import { useState, useEffect } from "react";
import { Search, UserPlus, Users, Phone, Mail, CreditCard } from "lucide-react";
import { Button } from "../components/ui/Button";
import { ClientFormModal } from "../components/clients/ClientFormModal";
import { formatCurrency } from "../lib/format";

export function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async (search?: string) => {
    const result = await window.api.clients.list(search);
    setClients(result);
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    loadClients(value);
  };

  const handleEdit = (client: any) => {
    setEditClient(client);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditClient(null);
    setShowForm(true);
  };

  const handleSelectClient = async (client: any) => {
    setSelectedClient(client);
    const result = await window.api.clients.purchases(client.id);
    setPurchases(result);
  };

  const handleSaved = () => {
    loadClients(query);
    if (selectedClient) {
      handleSelectClient(selectedClient);
    }
  };

  return (
    <div className="flex h-full">
      {/* Client List */}
      <div className="w-96 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-pos-text font-semibold text-lg">Clientes</h2>
            <Button variant="primary" size="sm" onClick={handleNew}>
              <UserPlus size={16} className="mr-1" />
              Nuevo
            </Button>
          </div>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted"
              size={18}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar por nombre, RFC o tel..."
              className="w-full bg-pos-card border border-slate-700 text-pos-text placeholder:text-slate-500 pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pos-blue"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {clients.length === 0 ? (
            <div className="flex items-center justify-center h-full text-pos-muted">
              <div className="text-center">
                <Users size={48} className="mx-auto mb-2 opacity-50" />
                <p>No hay clientes</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectClient(c)}
                  className={`w-full text-left px-4 py-3 cursor-pointer transition-colors ${
                    selectedClient?.id === c.id
                      ? "bg-pos-active"
                      : "hover:bg-pos-active/50"
                  }`}
                >
                  <p className="text-pos-text font-medium text-sm">
                    {c.nombre}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-pos-muted text-xs">
                    {c.rfc && <span>{c.rfc}</span>}
                    {c.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone size={10} />
                        {c.telefono}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedClient ? (
          <>
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-pos-text text-xl font-semibold">
                    {selectedClient.nombre}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-pos-muted text-sm">
                    {selectedClient.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone size={14} /> {selectedClient.telefono}
                      </span>
                    )}
                    {selectedClient.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={14} /> {selectedClient.email}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(selectedClient)}
                >
                  Editar
                </Button>
              </div>

              {/* Fiscal + Credit info */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                {selectedClient.rfc && (
                  <div className="bg-pos-bg rounded-lg p-3">
                    <p className="text-pos-muted text-xs uppercase tracking-wider">
                      RFC
                    </p>
                    <p className="text-pos-text font-medium mt-1">
                      {selectedClient.rfc}
                    </p>
                  </div>
                )}
                {selectedClient.razonSocial && (
                  <div className="bg-pos-bg rounded-lg p-3">
                    <p className="text-pos-muted text-xs uppercase tracking-wider">
                      Razon Social
                    </p>
                    <p className="text-pos-text font-medium mt-1">
                      {selectedClient.razonSocial}
                    </p>
                  </div>
                )}
                <div className="bg-pos-bg rounded-lg p-3">
                  <p className="text-pos-muted text-xs uppercase tracking-wider flex items-center gap-1">
                    <CreditCard size={12} /> Credito
                  </p>
                  <p className="text-pos-text font-medium mt-1">
                    {formatCurrency(selectedClient.saldoCredito)} /{" "}
                    {formatCurrency(selectedClient.limiteCredito)}
                  </p>
                </div>
              </div>
            </div>

            {/* Purchase history */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-pos-muted text-xs uppercase tracking-wider mb-3">
                Historial de Compras
              </h3>
              {purchases.length === 0 ? (
                <p className="text-pos-muted text-sm">Sin compras registradas</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-pos-muted text-xs uppercase tracking-wider border-b border-slate-700">
                      <th className="text-left py-2 px-3">Folio</th>
                      <th className="text-left py-2 px-3">Fecha</th>
                      <th className="text-right py-2 px-3">Total</th>
                      <th className="text-center py-2 px-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((v) => (
                      <tr
                        key={v.id}
                        className="border-b border-slate-800 hover:bg-pos-active/30 transition-colors"
                      >
                        <td className="py-2 px-3 text-pos-text text-sm font-mono">
                          {v.folio}
                        </td>
                        <td className="py-2 px-3 text-pos-muted text-sm">
                          {v.fecha
                            ? new Date(v.fecha).toLocaleDateString("es-MX")
                            : "\u2014"}
                        </td>
                        <td className="py-2 px-3 text-right text-pos-green font-medium tabular-nums">
                          {formatCurrency(v.total)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              v.estado === "completada"
                                ? "bg-green-500/20 text-pos-green"
                                : v.estado === "cancelada"
                                ? "bg-red-500/20 text-pos-red"
                                : "bg-amber-500/20 text-pos-amber"
                            }`}
                          >
                            {v.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-pos-muted">
            <div className="text-center">
              <Users size={64} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg">Selecciona un cliente</p>
              <p className="text-sm mt-1">
                o crea uno nuevo para ver sus datos
              </p>
            </div>
          </div>
        )}
      </div>

      <ClientFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSaved={handleSaved}
        client={editClient}
      />
    </div>
  );
}
