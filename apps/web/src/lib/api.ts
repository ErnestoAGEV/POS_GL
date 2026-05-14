const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let token: string | null = null;

export function setToken(t: string | null) {
  token = t;
  if (t) {
    if (typeof window !== "undefined") localStorage.setItem("posgl_token", t);
  } else {
    if (typeof window !== "undefined") localStorage.removeItem("posgl_token");
  }
}

export function getToken(): string | null {
  if (token) return token;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("posgl_token");
  }
  return token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const t = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    setToken(null);
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Error" }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
  },
  dashboard: {
    summary: (desde: string, hasta: string) =>
      request<any>(`/reportes/resumen?desde=${desde}&hasta=${hasta}`),
    dailySales: (desde: string, hasta: string) =>
      request<any>(`/reportes/ventas-diarias?desde=${desde}&hasta=${hasta}`),
    topProducts: (desde: string, hasta: string, limit = 10) =>
      request<any>(`/reportes/top-productos?desde=${desde}&hasta=${hasta}&limit=${limit}`),
    paymentMethods: (desde: string, hasta: string) =>
      request<any>(`/reportes/metodos-pago?desde=${desde}&hasta=${hasta}`),
  },
  ventas: {
    list: (page = 1, limit = 50) =>
      request<any>(`/ventas?page=${page}&limit=${limit}`),
  },
  productos: {
    list: (page = 1, limit = 50) =>
      request<any>(`/productos?page=${page}&limit=${limit}`),
  },
  clientes: {
    list: (page = 1, limit = 50) =>
      request<any>(`/clientes?page=${page}&limit=${limit}`),
  },
  sucursales: {
    list: () => request<any>("/sucursales"),
  },
};
