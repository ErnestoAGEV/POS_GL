"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  LogOut,
} from "lucide-react";
import { getToken, setToken } from "@/lib/api";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/ventas", icon: ShoppingCart, label: "Ventas" },
  { href: "/inventario", icon: Package, label: "Inventario" },
  { href: "/clientes", icon: Users, label: "Clientes" },
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

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
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
            <div className="px-3 py-2 text-xs text-pos-muted mb-2">
              <div className="text-pos-text font-medium">{user.nombre}</div>
              <div>{user.rol}</div>
            </div>
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
