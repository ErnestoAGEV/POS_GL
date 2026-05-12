import { useState } from "react";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useAuthStore } from "../stores/auth-store";
import { LogIn, Server } from "lucide-react";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showServer, setShowServer] = useState(false);
  const login = useAuthStore((s) => s.login);
  const loginError = useAuthStore((s) => s.loginError);
  const isLoading = useAuthStore((s) => s.isLoading);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const setServerUrl = useAuthStore((s) => s.setServerUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    await login(username, password);
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
            label="Contrasena"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />

          {loginError && (
            <p className="text-pos-red text-sm text-center">{loginError}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            <LogIn size={20} />
            {isLoading ? "Conectando..." : "Iniciar Sesion"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setShowServer(!showServer)}
          className="w-full mt-4 flex items-center justify-center gap-1 text-pos-muted text-xs hover:text-pos-text cursor-pointer transition-colors"
        >
          <Server size={12} />
          Configurar servidor
        </button>

        {showServer && (
          <div className="mt-3">
            <Input
              label="URL del Servidor"
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:3000"
            />
          </div>
        )}

        <p className="text-pos-muted text-xs text-center mt-6">v0.1.0</p>
      </div>
    </div>
  );
}
