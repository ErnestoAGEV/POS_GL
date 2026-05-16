"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  LogOut,
  Truck,
  ArrowLeftRight,
  Warehouse,
  UserCog,
  Building2,
  ContactRound,
  FolderTree,
  Scissors,
  FileText,
  Tags,
  PackageCheck,
  CreditCard,
  BarChart3,
  ClipboardList,
  Monitor,
  RotateCcw,
} from "lucide-react";
import { getToken, setToken } from "@/lib/api";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/ventas", icon: ShoppingCart, label: "Ventas" },
  { href: "/inventario", icon: Package, label: "Inventario" },
  { href: "/categorias", icon: FolderTree, label: "Categorias" },
  { href: "/clientes", icon: Users, label: "Clientes" },
  { href: "/compras", icon: Truck, label: "Compras" },
  { href: "/traspasos", icon: ArrowLeftRight, label: "Traspasos" },
  { href: "/stock", icon: Warehouse, label: "Stock" },
  { href: "/devoluciones", icon: RotateCcw, label: "Devoluciones" },
  { href: "/cortes", icon: Scissors, label: "Cortes" },
  { href: "/facturas", icon: FileText, label: "Facturas" },
  { href: "/promociones", icon: Tags, label: "Promociones", admin: true },
  { href: "/apartados", icon: PackageCheck, label: "Apartados" },
  { href: "/tarjetas-regalo", icon: CreditCard, label: "T. Regalo" },
  { href: "/reportes", icon: BarChart3, label: "Reportes", admin: true },
  { href: "/bitacora", icon: ClipboardList, label: "Bitacora", admin: true },
  { href: "/proveedores", icon: ContactRound, label: "Proveedores", admin: true },
  { href: "/usuarios", icon: UserCog, label: "Usuarios", admin: true },
  { href: "/sucursales", icon: Building2, label: "Sucursales", admin: true },
  { href: "/terminales", icon: Monitor, label: "Terminales", admin: true },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    const stored = localStorage.getItem("posgl_user");
    if (stored) setUser(JSON.parse(stored));
  }, [router]);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("posgl_user");
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex bg-pos-bg">
      {/* Sidebar */}
      <aside className="w-56 bg-pos-card border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold text-pos-green">POSGL</h1>
          <p className="text-xs text-pos-muted mt-0.5">Dashboard</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.filter((item) => !item.admin || user?.rol === "admin").map((item) => {
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                  active
                    ? "bg-pos-active text-pos-green"
                    : "text-pos-muted hover:text-pos-text hover:bg-pos-active/50"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700">
          {user && (
            <a href="/perfil" className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-pos-muted hover:text-pos-text hover:bg-pos-active/50 transition-colors cursor-pointer mb-1">
              <UserCog size={14} />
              <div>
                <div className="text-pos-text font-medium text-sm">{user.nombre}</div>
                <div>{user.rol}</div>
              </div>
            </a>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-pos-muted hover:text-pos-red hover:bg-pos-active/50 transition-colors cursor-pointer w-full"
          >
            <LogOut size={18} />
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
