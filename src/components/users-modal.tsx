"use client";

import { useState, useEffect } from "react";
import {
  X,
  Users,
  Search,
  Plus,
  Shield,
  KeyRound,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  AtSign,
} from "lucide-react";

interface UsuarioItem {
  id: string;
  nombre: string;
  usuario?: string;
  correo: string;
  rol: string;
  activo: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface UsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function UsersModal({ isOpen, onClose, onUpdated }: UsersModalProps) {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Submodal Form state (Crear / Editar)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioItem | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formUsuario, setFormUsuario] = useState("");
  const [formCorreo, setFormCorreo] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formRol, setFormRol] = useState("ADMIN");
  const [formActivo, setFormActivo] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Eliminación
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsuarios = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/usuarios?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudieron obtener los usuarios.");
      }
      setUsuarios(data.usuarios || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cargar usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsuarios();
    }
  }, [isOpen]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormNombre("");
    setFormUsuario("");
    setFormCorreo("");
    setFormPassword("");
    setFormConfirmPassword("");
    setFormRol("ADMIN");
    setFormActivo(true);
    setShowPassword(false);
    setFormError("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: UsuarioItem) => {
    setEditingUser(user);
    setFormNombre(user.nombre);
    setFormUsuario(user.usuario || "");
    setFormCorreo(user.correo);
    setFormPassword("");
    setFormConfirmPassword("");
    setFormRol(user.rol || "ADMIN");
    setFormActivo(user.activo);
    setShowPassword(false);
    setFormError("");
    setIsFormOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formNombre.trim()) {
      setFormError("El nombre completo es obligatorio.");
      return;
    }
    if (!formCorreo.trim() || !formCorreo.includes("@")) {
      setFormError("Ingresa un correo electrónico válido.");
      return;
    }

    if (!editingUser) {
      if (!formPassword || formPassword.length < 6) {
        setFormError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setFormError("Las contraseñas no coinciden.");
        return;
      }
    } else {
      if (formPassword && formPassword.length < 6) {
        setFormError("La nueva contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (formPassword && formPassword !== formConfirmPassword) {
        setFormError("Las contraseñas no coinciden.");
        return;
      }
    }

    setSaving(true);
    try {
      if (!editingUser) {
        const res = await fetch("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: formNombre.trim(),
            usuario: formUsuario.trim() || undefined,
            correo: formCorreo.trim().toLowerCase(),
            password: formPassword,
            rol: formRol,
            activo: formActivo,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al crear usuario.");
        setSuccessMsg(`Usuario "${data.usuario.nombre}" creado exitosamente.`);
      } else {
        const payload: any = {
          id: editingUser.id,
          nombre: formNombre.trim(),
          usuario: formUsuario.trim() || undefined,
          correo: formCorreo.trim().toLowerCase(),
          rol: formRol,
          activo: formActivo,
        };
        if (formPassword.trim()) {
          payload.password = formPassword;
        }

        const res = await fetch("/api/usuarios", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al actualizar usuario.");
        setSuccessMsg(`Usuario "${data.usuario.nombre}" actualizado.`);
      }

      setIsFormOpen(false);
      fetchUsuarios();
      if (onUpdated) onUpdated();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setFormError(err.message || "Error al procesar la solicitud.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: UsuarioItem) => {
    if (
      !window.confirm(
        `¿Confirmas que deseas eliminar al usuario "${user.nombre}" (${user.correo})? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/usuarios?id=${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar usuario.");
      setSuccessMsg(`Usuario "${user.nombre}" eliminado.`);
      fetchUsuarios();
      if (onUpdated) onUpdated();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al eliminar usuario.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  const totalActivos = usuarios.filter((u) => u.activo).length;
  const totalAdmins = usuarios.filter((u) => u.rol === "ADMIN").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Panel de Usuarios y Accesos
                </h2>
                <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                  {usuarios.length} registrados
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Gestión de credenciales, roles y acceso de usuarios al sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notificaciones */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Resumen & Toolbar */}
        <div className="p-6 pb-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Total Usuarios
              </span>
              <p className="text-xl font-bold text-slate-800 mt-0.5">
                {usuarios.length}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
              <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">
                Usuarios Activos
              </span>
              <p className="text-xl font-bold text-emerald-700 mt-0.5">
                {totalActivos}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/70">
              <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider">
                Administradores
              </span>
              <p className="text-xl font-bold text-blue-700 mt-0.5">
                {totalAdmins}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, usuario (@) o correo..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchUsuarios()}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchUsuarios}
                disabled={loading}
                title="Actualizar lista"
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
              >
                <Plus className="h-4 w-4" />
                Nuevo Usuario
              </button>
            </div>
          </div>
        </div>

        {/* User Table Body */}
        <div className="p-6 pt-2 flex-1 overflow-y-auto min-h-[260px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              <span className="text-xs">Cargando usuarios...</span>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl p-6">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h4 className="font-semibold text-slate-700 text-sm">
                No hay usuarios registrados
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Crea el primer usuario para comenzar a gestionar el acceso al sistema.
              </p>
              <button
                onClick={handleOpenCreate}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                Registrar Usuario
              </button>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-4">Nombre / Usuario</th>
                    <th className="py-2.5 px-4">Correo</th>
                    <th className="py-2.5 px-4 text-center">Rol</th>
                    <th className="py-2.5 px-4 text-center">Estado</th>
                    <th className="py-2.5 px-4 text-center">Registro</th>
                    <th className="py-2.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuarios.map((u) => {
                    const initials = u.nombre
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {initials || "U"}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{u.nombre}</div>
                              <div className="text-[11px] text-blue-600 font-mono font-medium">
                                @{u.usuario || u.correo.split("@")[0]}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {u.correo}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                              u.rol === "ADMIN"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : u.rol === "FACTURADOR"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            <Shield className="h-3 w-3" />
                            {u.rol === "ADMIN"
                              ? "Admin"
                              : u.rol === "FACTURADOR"
                              ? "Facturador"
                              : "Operador"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                              u.activo
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {u.activo ? (
                              <>
                                <UserCheck className="h-3 w-3" />
                                Activo
                              </>
                            ) : (
                              <>
                                <UserX className="h-3 w-3" />
                                Inactivo
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              title="Editar usuario"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={deletingId === u.id}
                              title="Eliminar usuario"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {deletingId === u.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Cada usuario ingresa con su <strong>usuario</strong> o <strong>correo</strong> y su contraseña cifrada.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-white transition-all shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* SUBMODAL: Crear / Editar Usuario */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingUser
                      ? "Modifica datos o actualiza contraseña"
                      : "Registra credenciales para ingresar al sistema"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Usuario de Ingreso (Login)
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ej. jperez (opcional)"
                    value={formUsuario}
                    onChange={(e) => setFormUsuario(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="usuario@stylekorean.mx"
                    value={formCorreo}
                    onChange={(e) => setFormCorreo(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    {editingUser ? "Nueva Contraseña (opcional)" : "Contraseña"}{" "}
                    {!editingUser && <span className="text-rose-500">*</span>}
                  </label>
                  {editingUser && (
                    <span className="text-[10px] text-slate-400 italic">
                      Dejar vacía para conservar la actual
                    </span>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={editingUser ? "•••••••• (sin cambios)" : "Mínimo 6 caracteres"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {(formPassword.length > 0 || !editingUser) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmar Contraseña <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Repite la contraseña"
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rol
                  </label>
                  <select
                    value={formRol}
                    onChange={(e) => setFormRol(e.target.value)}
                    className="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="FACTURADOR">Facturador</option>
                    <option value="OPERADOR">Operador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formActivo ? "true" : "false"}
                    onChange={(e) => setFormActivo(e.target.value === "true")}
                    className="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingUser ? "Guardar Cambios" : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
