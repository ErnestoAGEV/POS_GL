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
    salesByUser: (desde: string, hasta: string) =>
      request<any>(`/reportes/ventas-por-vendedor?desde=${desde}&hasta=${hasta}`),
    salesByHour: (desde: string, hasta: string) =>
      request<any>(`/reportes/ventas-por-hora?desde=${desde}&hasta=${hasta}`),
    salesByBranch: (desde: string, hasta: string) =>
      request<any>(`/reportes/ventas-por-sucursal?desde=${desde}&hasta=${hasta}`),
  },
  ventas: {
    list: (page = 1, limit = 50, params?: { desde?: string; hasta?: string }) => {
      let url = `/ventas?page=${page}&limit=${limit}`;
      if (params?.desde) url += `&desde=${params.desde}`;
      if (params?.hasta) url += `&hasta=${params.hasta}`;
      return request<any>(url);
    },
  },
  productos: {
    list: (page = 1, limit = 50, search?: string) =>
      request<any>(`/productos?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`),
  },
  clientes: {
    list: (page = 1, limit = 50, search?: string) =>
      request<any>(`/clientes?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`),
  },
  sucursales: {
    list: (page = 1, limit = 50) =>
      request<any>(`/sucursales?page=${page}&limit=${limit}`),
    get: (id: number) => request<any>(`/sucursales/${id}`),
    create: (data: any) =>
      request<any>("/sucursales", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/sucursales/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<any>(`/sucursales/${id}`, { method: "DELETE" }),
  },
  usuarios: {
    list: (page = 1, limit = 50) =>
      request<any>(`/usuarios?page=${page}&limit=${limit}`),
    create: (data: any) =>
      request<any>("/usuarios", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/usuarios/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<any>(`/usuarios/${id}`, { method: "DELETE" }),
  },
  proveedores: {
    list: (page = 1, limit = 50) =>
      request<any>(`/proveedores?page=${page}&limit=${limit}`),
    create: (data: any) =>
      request<any>("/proveedores", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/proveedores/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<any>(`/proveedores/${id}`, { method: "DELETE" }),
  },
  compras: {
    list: (page = 1, limit = 50, estado?: string) =>
      request<any>(`/compras?page=${page}&limit=${limit}${estado ? `&estado=${estado}` : ""}`),
    get: (id: number) => request<any>(`/compras/${id}`),
    create: (data: any) =>
      request<any>("/compras", { method: "POST", body: JSON.stringify(data) }),
    recibir: (id: number) =>
      request<any>(`/compras/${id}/recibir`, { method: "PUT" }),
    cancelar: (id: number) =>
      request<any>(`/compras/${id}/cancelar`, { method: "PUT" }),
  },
  traspasos: {
    list: (page = 1, limit = 50, estado?: string) =>
      request<any>(`/traspasos?page=${page}&limit=${limit}${estado ? `&estado=${estado}` : ""}`),
    get: (id: number) => request<any>(`/traspasos/${id}`),
    create: (data: any) =>
      request<any>("/traspasos", { method: "POST", body: JSON.stringify(data) }),
    enviar: (id: number) =>
      request<any>(`/traspasos/${id}/enviar`, { method: "PUT" }),
    recibir: (id: number) =>
      request<any>(`/traspasos/${id}/recibir`, { method: "PUT" }),
    cancelar: (id: number) =>
      request<any>(`/traspasos/${id}/cancelar`, { method: "PUT" }),
  },
  stock: {
    bySucursal: (sucursalId: number) => request<any>(`/stock/${sucursalId}`),
    alerts: (sucursalId: number) =>
      request<any>(`/stock/alerts?sucursalId=${sucursalId}`),
  },
  categorias: {
    list: (page = 1, limit = 50, parentId?: string) =>
      request<any>(`/categorias?page=${page}&limit=${limit}${parentId ? `&parentId=${parentId}` : ""}`),
    create: (data: any) =>
      request<any>("/categorias", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/categorias/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<any>(`/categorias/${id}`, { method: "DELETE" }),
  },
  terminales: {
    list: (page = 1, limit = 50, sucursalId?: number) =>
      request<any>(`/terminales?page=${page}&limit=${limit}${sucursalId ? `&sucursalId=${sucursalId}` : ""}`),
    create: (data: any) =>
      request<any>("/terminales", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/terminales/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<any>(`/terminales/${id}`, { method: "DELETE" }),
  },
  promociones: {
    list: (activas?: boolean) =>
      request<any>(`/promociones${activas !== undefined ? `?activas=${activas}` : ""}`),
    create: (data: any) =>
      request<any>("/promociones", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/promociones/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<any>(`/promociones/${id}`, { method: "DELETE" }),
  },
  cortes: {
    list: (page = 1, limit = 50, terminalId?: number) =>
      request<any>(`/cortes?page=${page}&limit=${limit}${terminalId ? `&terminalId=${terminalId}` : ""}`),
    get: (id: number) => request<any>(`/cortes/${id}`),
  },
  apartados: {
    list: (estado?: string) =>
      request<any>(`/apartados${estado ? `?estado=${estado}` : ""}`),
    get: (id: number) => request<any>(`/apartados/${id}`),
  },
  facturas: {
    list: (page = 1, limit = 50, estado?: string) =>
      request<any>(`/facturas?page=${page}&limit=${limit}${estado ? `&estado=${estado}` : ""}`),
    get: (id: number) => request<any>(`/facturas/${id}`),
  },
  bitacora: {
    list: (params?: { accion?: string; entidad?: string; desde?: string; hasta?: string }) => {
      const q = new URLSearchParams();
      if (params?.accion) q.set("accion", params.accion);
      if (params?.entidad) q.set("entidad", params.entidad);
      if (params?.desde) q.set("desde", params.desde);
      if (params?.hasta) q.set("hasta", params.hasta);
      const qs = q.toString();
      return request<any>(`/bitacora${qs ? `?${qs}` : ""}`);
    },
  },
  tarjetasRegalo: {
    list: () => request<any>("/tarjetas-regalo"),
  },
  devoluciones: {
    list: () => request<any>("/devoluciones"),
  },
};
