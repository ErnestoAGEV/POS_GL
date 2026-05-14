"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { token, user } = await api.auth.login(username, password);
      setToken(token);
      if (typeof window !== "undefined") {
        localStorage.setItem("posgl_user", JSON.stringify(user));
      }
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Error de autenticacion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pos-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pos-green">POSGL</h1>
          <p className="text-pos-muted text-sm mt-1">Panel de Administracion</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-pos-card border border-slate-700 rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-xs text-pos-muted mb-1">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-pos-text focus:border-pos-green focus:outline-none"
              placeholder="admin"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-pos-muted mb-1">Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-pos-text focus:border-pos-green focus:outline-none"
              placeholder="********"
            />
          </div>

          {error && (
            <div className="text-pos-red text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-2.5 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
