import {
  ShoppingCart,
  Package,
  Users,
  FileText,
  Scissors,
  BarChart3,
  Settings,
  LogOut,
  Tags,
  ClipboardList,
} from "lucide-react";
import { useAuthStore } from "../../stores/auth-store";

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  id: string;
}

const items: SidebarItem[] = [
  { icon: <ShoppingCart size={20} />, label: "Caja", id: "pos" },
  { icon: <Package size={20} />, label: "Inventario", id: "inventory" },
  { icon: <Users size={20} />, label: "Clientes", id: "clients" },
  { icon: <FileText size={20} />, label: "Facturas", id: "invoices" },
  { icon: <Scissors size={20} />, label: "Cortes", id: "cashcuts" },
  { icon: <Tags size={20} />, label: "Promos", id: "promos" },
  { icon: <BarChart3 size={20} />, label: "Reportes", id: "reports" },
  { icon: <ClipboardList size={20} />, label: "Bitacora", id: "bitacora" },
  { icon: <Settings size={20} />, label: "Config", id: "settings" },
];

interface SidebarProps {
  active: string;
  onNavigate: (id: string) => void;
}

export function Sidebar({ active, onNavigate }: SidebarProps) {
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="w-20 bg-pos-card border-r border-slate-700 flex flex-col items-center py-4 gap-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          aria-label={item.label}
          aria-current={active === item.id ? "page" : undefined}
          className={`
            w-16 h-16 flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer
            transition-colors duration-150
            ${
              active === item.id
                ? "bg-pos-active text-pos-green"
                : "text-pos-muted hover:text-pos-text hover:bg-pos-active"
            }
          `}
        >
          {item.icon}
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={logout}
        aria-label="Cerrar sesión"
        className="w-16 h-16 flex flex-col items-center justify-center gap-1 rounded-xl cursor-pointer text-pos-muted hover:text-pos-red hover:bg-pos-active transition-colors duration-150"
      >
        <LogOut size={20} />
        <span className="text-[10px] font-medium">Salir</span>
      </button>
    </aside>
  );
}
