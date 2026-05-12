import { useAuthStore } from "./stores/auth-store";
import { LoginPage } from "./pages/LoginPage";
import { PosPage } from "./pages/PosPage";

export function App() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  if (!isLoggedIn) return <LoginPage />;
  return <PosPage />;
}
