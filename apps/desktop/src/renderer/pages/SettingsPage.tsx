import { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  Monitor,
  User,
  Database,
  Server,
  HardDrive,
  Printer,
} from "lucide-react";
import { useAuthStore } from "../stores/auth-store";
import { useAppStore } from "../stores/app-store";
import { useSyncStore } from "../stores/sync-store";

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const sucursalNombre = useAppStore((s) => s.sucursalNombre);
  const sucursalId = useAppStore((s) => s.sucursalId);
  const terminalNombre = useAppStore((s) => s.terminalNombre);
  const terminalId = useAppStore((s) => s.terminalId);
  const syncStatus = useSyncStore((s) => s.status);

  const [appInfo, setAppInfo] = useState<any>(null);
  const [dbStats, setDbStats] = useState<any>(null);

  const [printerType, setPrinterType] = useState("text");
  const [printerInterface, setPrinterInterface] = useState("");
  const [printerWidth, setPrinterWidth] = useState(48);
  const [printerSaving, setPrinterSaving] = useState(false);
  const [printerMsg, setPrinterMsg] = useState("");

  useEffect(() => {
    loadInfo();
    loadPrinterConfig();
  }, []);

  const loadInfo = async () => {
    const [info, stats] = await Promise.all([
      window.api.config.appInfo(),
      window.api.config.dbStats(),
    ]);
    setAppInfo(info);
    setDbStats(stats);
  };

  const loadPrinterConfig = async () => {
    const cfg = await window.api.ticket.getConfig();
    if (cfg) {
      setPrinterType(cfg.type || "text");
      setPrinterInterface(cfg.interface || "");
      setPrinterWidth(cfg.width || 48);
    }
  };

  const savePrinterConfig = async () => {
    setPrinterSaving(true);
    setPrinterMsg("");
    try {
      await window.api.ticket.config(
        printerInterface
          ? { type: printerType, interface: printerInterface, width: printerWidth }
          : null
      );
      setPrinterMsg("Configuracion guardada");
    } catch {
      setPrinterMsg("Error al guardar");
    }
    setPrinterSaving(false);
    setTimeout(() => setPrinterMsg(""), 3000);
  };

  const testPrint = async () => {
    await window.api.ticket.print({
      folio: "TEST-001",
      fecha: new Date().toISOString(),
      sucursal: "Sucursal 1",
      terminal: `Terminal ${terminalId}`,
      cajero: user?.nombre ?? "Cajero",
      items: [{ nombre: "Producto de prueba", cantidad: 1, precioUnitario: 99.99, descuento: 0, subtotal: 99.99 }],
      subtotal: 99.99,
      descuento: 0,
      iva: 16.0,
      total: 115.99,
      pagos: [{ formaPago: "efectivo", monto: 120.0 }],
      cambio: 4.01,
    });
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <h1 className="text-pos-text text-xl font-semibold flex items-center gap-2 mb-6">
        <Settings size={22} />
        Configuracion
      </h1>

      <div className="grid grid-cols-2 gap-6 max-w-4xl">
        {/* Sucursal */}
        <div className="bg-pos-card border border-slate-700 rounded-xl p-5">
          <h2 className="text-pos-text font-semibold flex items-center gap-2 mb-4">
            <Building2 size={18} />
            Sucursal
          </h2>
          <div className="space-y-3">
            <InfoRow label="ID" value={String(sucursalId)} />
            <InfoRow label="Nombre" value={sucursalNombre} />
          </div>
        </div>

        {/* Terminal */}
        <div className="bg-pos-card border border-slate-700 rounded-xl p-5">
          <h2 className="text-pos-text font-semibold flex items-center gap-2 mb-4">
            <Monitor size={18} />
            Terminal
          </h2>
          <div className="space-y-3">
            <InfoRow label="ID" value={String(terminalId)} />
            <InfoRow label="Nombre" value={terminalNombre} />
          </div>
        </div>

        {/* User */}
        <div className="bg-pos-card border border-slate-700 rounded-xl p-5">
          <h2 className="text-pos-text font-semibold flex items-center gap-2 mb-4">
            <User size={18} />
            Usuario
          </h2>
          <div className="space-y-3">
            <InfoRow label="Nombre" value={user?.nombre || "\u2014"} />
            <InfoRow label="Usuario" value={user?.username || "\u2014"} />
            <InfoRow label="Rol" value={user?.rol || "\u2014"} />
          </div>
        </div>

        {/* Server */}
        <div className="bg-pos-card border border-slate-700 rounded-xl p-5">
          <h2 className="text-pos-text font-semibold flex items-center gap-2 mb-4">
            <Server size={18} />
            Servidor
          </h2>
          <div className="space-y-3">
            <InfoRow label="URL" value={serverUrl || "\u2014"} />
            <div className="flex justify-between items-center">
              <span className="text-pos-muted text-sm">Estado</span>
              <span className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    syncStatus === "online"
                      ? "bg-pos-green"
                      : syncStatus === "syncing"
                      ? "bg-pos-amber"
                      : "bg-pos-red"
                  }`}
                />
                <span className="text-pos-text text-sm">
                  {syncStatus === "online"
                    ? "Conectado"
                    : syncStatus === "syncing"
                    ? "Sincronizando"
                    : "Desconectado"}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Database Stats */}
        <div className="bg-pos-card border border-slate-700 rounded-xl p-5">
          <h2 className="text-pos-text font-semibold flex items-center gap-2 mb-4">
            <Database size={18} />
            Base de Datos Local
          </h2>
          {dbStats ? (
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Productos" value={dbStats.productos} />
              <StatCard label="Ventas" value={dbStats.ventas} />
              <StatCard label="Clientes" value={dbStats.clientes} />
              <StatCard label="Categorias" value={dbStats.categorias} />
            </div>
          ) : (
            <p className="text-pos-muted text-sm">Cargando...</p>
          )}
        </div>

        {/* Printer Config */}
        <div className="bg-pos-card border border-slate-700 rounded-xl p-5 col-span-2">
          <h2 className="text-pos-text font-semibold flex items-center gap-2 mb-4">
            <Printer size={18} />
            Impresora de Tickets
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-pos-muted text-xs block mb-1">Tipo</label>
              <select
                value={printerType}
                onChange={(e) => setPrinterType(e.target.value)}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm cursor-pointer"
              >
                <option value="text">Texto (consola)</option>
                <option value="epson">Epson ESC/POS</option>
                <option value="star">Star</option>
              </select>
            </div>
            <div>
              <label className="text-pos-muted text-xs block mb-1">Interfaz (IP o puerto)</label>
              <input
                type="text"
                value={printerInterface}
                onChange={(e) => setPrinterInterface(e.target.value)}
                placeholder="tcp://192.168.1.100 o /dev/usb/lp0"
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
              />
            </div>
            <div>
              <label className="text-pos-muted text-xs block mb-1">Ancho (columnas)</label>
              <input
                type="number"
                value={printerWidth}
                onChange={(e) => setPrinterWidth(parseInt(e.target.value) || 48)}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm font-mono"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={savePrinterConfig}
              disabled={printerSaving}
              className="px-4 py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-pos-green/80 disabled:opacity-50 cursor-pointer"
            >
              {printerSaving ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={testPrint}
              className="px-4 py-2 bg-pos-blue text-white rounded-lg text-sm font-medium hover:bg-pos-blue/80 cursor-pointer"
            >
              Imprimir Prueba
            </button>
            {printerMsg && (
              <span className="text-pos-green text-sm">{printerMsg}</span>
            )}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-pos-card border border-slate-700 rounded-xl p-5">
          <h2 className="text-pos-text font-semibold flex items-center gap-2 mb-4">
            <HardDrive size={18} />
            Sistema
          </h2>
          {appInfo ? (
            <div className="space-y-3">
              <InfoRow label="Version" value={appInfo.version} />
              <InfoRow label="Plataforma" value={`${appInfo.platform} (${appInfo.arch})`} />
              <InfoRow label="DB" value={appInfo.dbPath} mono />
            </div>
          ) : (
            <p className="text-pos-muted text-sm">Cargando...</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-pos-muted text-sm">{label}</span>
      <span
        className={`text-pos-text text-sm ${mono ? "font-mono text-xs max-w-[200px] truncate" : ""}`}
        title={mono ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-pos-bg rounded-lg p-3 text-center">
      <p className="text-pos-text text-xl font-bold tabular-nums">{value}</p>
      <p className="text-pos-muted text-xs mt-1">{label}</p>
    </div>
  );
}
