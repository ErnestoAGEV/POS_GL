import { useState } from "react";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useAuthStore } from "../stores/auth-store";
import { LogIn } from "lucide-react";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // For Phase 3, we do a simple local auth
    // In Phase 4 (sync), this will authenticate against the server
    if (username === "admin" && password === "admin123") {
      login({
        id: 1,
        nombre: "Administrador",
        username: "admin",
        rol: "admin",
        sucursalId: 1,
      });
    } else if (username && password) {
      // Accept any non-empty credentials for demo
      login({
        id: 2,
        nombre: username,
        username,
        rol: "cajero",
        sucursalId: 1,
      });
    } else {
      setError("Ingresa usuario y contraseña");
    }
  };

  return (
    <div className="min-h-screen bg-pos-bg flex items-center justify-center">
      <div className="bg-pos-card rounded-2xl border border-slate-700 shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-heading text-pos-green">POSGL</h1>
          <p className="text-pos-muted text-sm mt-2">Sistema Punto de Venta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Usuario"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoFocus
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && (
            <p className="text-pos-red text-sm text-center">{error}</p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full flex items-center justify-center gap-2">
            <LogIn size={20} />
            Iniciar Sesión
          </Button>
        </form>

        <p className="text-pos-muted text-xs text-center mt-6">
          v0.1.0 — Fase 3
        </p>
      </div>
    </div>
  );
}
