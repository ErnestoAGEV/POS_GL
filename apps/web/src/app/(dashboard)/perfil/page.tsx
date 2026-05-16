"use client";

import { useState, useEffect } from "react";
import { UserCog, Lock, Check } from "lucide-react";
import { api } from "@/lib/api";

export default function PerfilPage() {
  const [user, setUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("posgl_user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleChangePassword = async () => {
    setMessage(null);
    if (!currentPassword || !newPassword) {
      setMessage({ type: "error", text: "Completa todos los campos" });
      return;
    }
    if (newPassword.length < 4) {
      setMessage({ type: "error", text: "La nueva contraseña debe tener al menos 4 caracteres" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Las contraseñas no coinciden" });
      return;
    }

    setSaving(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      setMessage({ type: "success", text: "Contraseña actualizada correctamente" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error al cambiar contraseña" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div className="flex items-center gap-2">
        <UserCog size={20} className="text-pos-blue" />
        <h1 className="text-2xl font-bold text-pos-text">Mi Perfil</h1>
      </div>

      {/* User info */}
      {user && (
        <div className="bg-pos-card border border-slate-700 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-pos-muted">Nombre</span>
            <span className="text-sm text-pos-text font-medium">{user.nombre}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-pos-muted">Usuario</span>
            <span className="text-sm text-pos-text font-mono">{user.username}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-pos-muted">Rol</span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded ${user.rol === "admin" ? "bg-pos-blue/20 text-pos-blue" : "bg-pos-green/20 text-pos-green"}`}>{user.rol}</span>
          </div>
        </div>
      )}

      {/* Change password */}
      <div className="bg-pos-card border border-slate-700 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-pos-muted" />
          <h2 className="text-sm font-medium text-pos-text">Cambiar Contraseña</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-pos-muted">Contraseña actual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-pos-muted">Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-pos-muted">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm mt-1"
            />
          </div>
        </div>

        {message && (
          <div className={`rounded-lg px-3 py-2 text-sm ${message.type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {message.type === "success" && <Check size={14} className="inline mr-1" />}
            {message.text}
          </div>
        )}

        <button
          onClick={handleChangePassword}
          disabled={saving}
          className="px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {saving ? "Guardando..." : "Cambiar Contraseña"}
        </button>
      </div>
    </div>
  );
}
