"use client";

import { useState, useEffect } from "react";
import { UserCog, Plus, Download, X, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { exportToExcel } from "@/lib/export-excel";

interface Usuario {
  id: number;
  nombre: string;
  username: string;
  rol: string;
  sucursalId: number;
  activo: boolean;
  createdAt: string;
}

interface Sucursal {
  id: number;
  nombre: string;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: "", username: "", password: "", rol: "cajero", sucursalId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucMap, setSucMap] = useState<Record<number, string>>({});

  useEffect(() => {
    api.sucursales.list(1, 500).then((res) => {
      const list = res.data || res;
      setSucursales(list);
      const map: Record<number, string> = {};
      for (const s of list) map[s.id] = s.nombre;
      setSucMap(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadUsuarios();
  }, [page]);

  const loadUsuarios = () => {
    setLoading(true);
    api.usuarios
      .list(page, 50)
      .then((res) => setUsuarios(res.data || []))
      .catch(() => setUsuarios([]))
      .finally(() => setLoading(false));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        const data: any = { nombre: form.nombre, rol: form.rol, sucursalId: Number(form.sucursalId) };
        if (form.password) data.password = form.password;
        await api.usuarios.update(editingId, data);
      } else {
        await api.usuarios.create({
          nombre: form.nombre,
          username: form.username,
          password: form.password,
          rol: form.rol,
          sucursalId: Number(form.sucursalId),
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ nombre: "", username: "", password: "", rol: "cajero", sucursalId: "" });
      loadUsuarios();
    } catch (e: any) {
      setError(e.message || (editingId ? "Error al actualizar" : "Error al crear usuario"));
    }
    setSaving(false);
  };

  const handleEdit = (u: Usuario) => {
    setForm({
      nombre: u.nombre,
      username: u.username,
      password: "",
      rol: u.rol,
      sucursalId: String(u.sucursalId),
    });
    setEditingId(u.id);
    setError("");
    setShowForm(true);
  };

  const handleToggle = async (u: Usuario) => {
    await api.usuarios.update(u.id, { activo: !u.activo });
    setUsuarios((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, activo: !x.activo } : x))
    );
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCog size={20} className="text-pos-blue" />
          <h1 className="text-2xl font-bold text-pos-text">Usuarios</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditingId(null); setForm({ nombre: "", username: "", password: "", rol: "cajero", sucursalId: "" }); setError(""); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-pos-blue text-white rounded-lg text-sm hover:bg-pos-blue/80 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Nuevo Usuario
          </button>
          {usuarios.length > 0 && (
            <button
              onClick={() =>
                exportToExcel(
                  usuarios.map((u) => ({
                    Nombre: u.nombre,
                    Usuario: u.username,
                    Rol: u.rol,
                    Sucursal: sucMap[u.sucursalId] || `#${u.sucursalId}`,
                    Estado: u.activo ? "Activo" : "Inactivo",
                    Creado: new Date(u.createdAt).toLocaleDateString("es-MX"),
                  })),
                  "usuarios"
                )
              }
              className="flex items-center gap-2 px-4 py-2 bg-pos-green/20 text-pos-green rounded-lg text-sm hover:bg-pos-green/30 transition-colors cursor-pointer"
            >
              <Download size={16} />
              Excel
            </button>
          )}
        </div>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-pos-card border border-slate-700 rounded-2xl w-[450px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-pos-text font-semibold">{editingId ? "Editar Usuario" : "Nuevo Usuario"}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-pos-muted hover:text-pos-text cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                placeholder="Nombre completo"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
              />
              <input
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                disabled={!!editingId}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50 disabled:opacity-50"
              />
              <input
                type="password"
                placeholder={editingId ? "Nueva password (dejar vacio para no cambiar)" : "Password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm placeholder:text-pos-muted/50"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  className="bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm cursor-pointer"
                >
                  <option value="cajero">Cajero</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  value={form.sucursalId}
                  onChange={(e) => setForm({ ...form, sucursalId: e.target.value })}
                  className="bg-pos-bg border border-slate-700 rounded-lg px-3 py-2 text-pos-text text-sm cursor-pointer"
                >
                  <option value="">Sucursal...</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-pos-red text-xs">{error}</p>}
              <button
                onClick={handleSave}
                disabled={saving || !form.nombre || !form.sucursalId || (!editingId && (!form.username || !form.password))}
                className="w-full py-2 bg-pos-green text-white rounded-lg text-sm font-medium hover:bg-pos-green/80 disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear Usuario"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-pos-card border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-pos-muted border-b border-slate-700">
              <th className="p-3 font-medium">Nombre</th>
              <th className="p-3 font-medium">Username</th>
              <th className="p-3 font-medium">Rol</th>
              <th className="p-3 font-medium">Sucursal</th>
              <th className="p-3 font-medium">Creado</th>
              <th className="p-3 font-medium text-center">Estado</th>
              <th className="p-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-pos-muted text-sm">Cargando...</td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-pos-muted text-sm">No hay usuarios</td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} className="border-b border-slate-800 text-sm hover:bg-pos-active/30 transition-colors">
                  <td className="p-3 text-pos-text font-medium">{u.nombre}</td>
                  <td className="p-3 text-pos-muted font-mono text-xs">{u.username}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.rol === "admin" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                    }`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="p-3 text-pos-muted">{sucMap[u.sucursalId] || `Suc. #${u.sucursalId}`}</td>
                  <td className="p-3 text-pos-muted text-xs">{new Date(u.createdAt).toLocaleDateString("es-MX")}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggle(u)}
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                        u.activo ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-pos-muted"
                      }`}
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleEdit(u)} className="p-1.5 rounded-lg bg-pos-blue/20 text-pos-blue hover:bg-pos-blue/30 cursor-pointer" title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={async () => { if (confirm("Eliminar usuario?")) { await api.usuarios.delete(u.id); loadUsuarios(); } }} className="p-1.5 rounded-lg bg-pos-red/20 text-pos-red hover:bg-pos-red/30 cursor-pointer" title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer"
        >
          Anterior
        </button>
        <span className="px-4 py-2 text-sm text-pos-muted">Pagina {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={usuarios.length < 50}
          className="px-4 py-2 bg-pos-card border border-slate-700 rounded-lg text-sm text-pos-muted hover:text-pos-text disabled:opacity-50 cursor-pointer"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
