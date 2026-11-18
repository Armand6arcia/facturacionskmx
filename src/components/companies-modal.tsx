"use client";

import { useState, useEffect } from "react";
import {
  X,
  Building2,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  Edit2,
  Trash2,
  Shield,
  KeyRound,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

interface Empresa {
  id: string;
  nombreCorto: string;
  razonSocial: string;
  rfc: string;
  regimenFiscal: string;
  codigoPostal: string;
  serie: string;
  pacProvider: string;
  apiKey?: string;
  hasSecretKey?: boolean;
  secretKeyMasked?: string;
  ambiente: string;
  activa: boolean;
  color?: string;
  _count?: { documentos: number; clientes: number };
}

interface CompaniesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmpresasUpdated?: () => void;
}

const COLOR_OPTIONS = [
  { id: "blue", label: "Azul", bg: "bg-blue-600", border: "border-blue-600", light: "bg-blue-50 text-blue-700" },
  { id: "indigo", label: "Índigo", bg: "bg-indigo-600", border: "border-indigo-600", light: "bg-indigo-50 text-indigo-700" },
  { id: "emerald", label: "Esmeralda", bg: "bg-emerald-600", border: "border-emerald-600", light: "bg-emerald-50 text-emerald-700" },
  { id: "purple", label: "Púrpura", bg: "bg-purple-600", border: "border-purple-600", light: "bg-purple-50 text-purple-700" },
  { id: "amber", label: "Ámbar", bg: "bg-amber-600", border: "border-amber-600", light: "bg-amber-50 text-amber-700" },
];

export function CompaniesModal({ isOpen, onClose, onEmpresasUpdated }: CompaniesModalProps) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form state
  const [nombreCorto, setNombreCorto] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [rfc, setRfc] = useState("");
  const [regimenFiscal, setRegimenFiscal] = useState("601");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [serie, setSerie] = useState("F");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [ambiente, setAmbiente] = useState("production");
  const [color, setColor] = useState("blue");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchEmpresas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/empresas");
      const data = await res.json();
      if (data.empresas) {
        setEmpresas(data.empresas);
      }
    } catch (e: any) {
      console.error("Error al cargar empresas:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEmpresas();
      setIsFormOpen(false);
      setEditingEmpresa(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const handleOpenCreate = () => {
    setEditingEmpresa(null);
    setNombreCorto("");
    setRazonSocial("");
    setRfc("");
    setRegimenFiscal("601");
    setCodigoPostal("");
    setSerie("F");
    setApiKey("");
    setSecretKey("");
    setAmbiente("production");
    setColor("indigo");
    setError(null);
    setSuccessMsg(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (emp: Empresa) => {
    setEditingEmpresa(emp);
    setNombreCorto(emp.nombreCorto || "");
    setRazonSocial(emp.razonSocial || "");
    setRfc(emp.rfc || "");
    setRegimenFiscal(emp.regimenFiscal || "601");
    setCodigoPostal(emp.codigoPostal || "");
    setSerie(emp.serie || "F");
    setApiKey(emp.apiKey || "");
    setSecretKey(emp.secretKeyMasked || "");
    setAmbiente(emp.ambiente || "production");
    setColor(emp.color || "blue");
    setError(null);
    setSuccessMsg(null);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload: any = {
        nombreCorto: nombreCorto.trim(),
        razonSocial: razonSocial.trim().toUpperCase(),
        rfc: rfc.trim().toUpperCase(),
        regimenFiscal: regimenFiscal.trim(),
        codigoPostal: codigoPostal.trim(),
        serie: serie.trim().toUpperCase() || "F",
        apiKey: apiKey.trim(),
        secretKey: secretKey.trim(),
        ambiente,
        color,
      };

      let res;
      if (editingEmpresa) {
        payload.id = editingEmpresa.id;
        res = await fetch("/api/empresas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/empresas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al procesar empresa");
      }

      setSuccessMsg(data.mensaje || "Empresa guardada exitosamente.");
      setIsFormOpen(false);
      await fetchEmpresas();
      if (onEmpresasUpdated) onEmpresasUpdated();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Error al guardar empresa");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp: Empresa) => {
    if (
      !window.confirm(
        `¿Confirmas que deseas desactivar la empresa "${emp.nombreCorto}" (${emp.rfc})? Sus facturas históricas se mantendrán registradas.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/empresas?id=${encodeURIComponent(emp.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar empresa");
      }
      setSuccessMsg(data.mensaje || "Empresa eliminada.");
      await fetchEmpresas();
      if (onEmpresasUpdated) onEmpresasUpdated();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Error al eliminar empresa");
      setTimeout(() => setError(null), 4000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Perfiles y Empresas Emisoras</h3>
              <p className="text-xs text-slate-500">
                Administra tus cuentas de Factura.com y datos fiscales para timbrado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="px-6 py-2.5 text-xs bg-red-50 text-red-800 border-b border-red-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="px-6 py-2.5 text-xs bg-emerald-50 text-emerald-800 border-b border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {!isFormOpen ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Empresas Registradas ({empresas.length} de 3 perfiles)
                </span>
                {empresas.length < 5 && (
                  <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Agregar Empresa</span>
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-xs">Cargando empresas...</span>
                </div>
              ) : empresas.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl bg-slate-50">
                  <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No hay empresas configuradas</p>
                  <button
                    onClick={handleOpenCreate}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Dar de alta la primera empresa
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {empresas.map((emp) => {
                    const colorCfg =
                      COLOR_OPTIONS.find((c) => c.id === emp.color) || COLOR_OPTIONS[0];

                    return (
                      <div
                        key={emp.id}
                        className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all flex items-start justify-between gap-4"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className={`h-10 w-10 rounded-xl ${colorCfg.bg} text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0`}
                          >
                            {emp.nombreCorto.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">
                                {emp.nombreCorto}
                              </span>
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {emp.rfc}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded border bg-slate-50 text-slate-600">
                                Serie: {emp.serie}
                              </span>
                              {emp.ambiente === "sandbox" && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                  Sandbox
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 truncate">{emp.razonSocial}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                              <span>C.P. {emp.codigoPostal}</span>
                              <span>Régimen {emp.regimenFiscal}</span>
                              {emp.apiKey ? (
                                <span className="text-emerald-600 font-medium flex items-center gap-1">
                                  <KeyRound className="h-3 w-3" /> API Key conectada
                                </span>
                              ) : (
                                <span className="text-amber-600 font-medium">Sin API Key propia</span>
                              )}
                              {emp._count && (
                                <span>
                                  {emp._count.documentos} CFDI | {emp._count.clientes} clientes
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            title="Editar empresa"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {empresas.length > 1 && (
                            <button
                              onClick={() => handleDelete(emp)}
                              title="Desactivar empresa"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Formulario Alta / Edición */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {editingEmpresa ? `Editar Perfil: ${editingEmpresa.nombreCorto}` : "Alta de Nueva Empresa / Perfil"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Volver al listado
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre Corto (para selector) *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombreCorto}
                    onChange={(e) => setNombreCorto(e.target.value)}
                    placeholder="Ej. StyleKorean MX"
                    className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RFC Emisor (12 o 13 car.) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={13}
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase())}
                    placeholder="SMX250408I48"
                    className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Razón Social Oficial (Emisor) *
                </label>
                <input
                  type="text"
                  required
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value.toUpperCase())}
                  placeholder="STYLE KOREAN MEXICO S.A. DE C.V."
                  className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm uppercase focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Régimen Fiscal *
                  </label>
                  <select
                    value={regimenFiscal}
                    onChange={(e) => setRegimenFiscal(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="601">601 - General Morales</option>
                    <option value="612">612 - Personas Físicas</option>
                    <option value="626">626 - RESICO</option>
                    <option value="603">603 - Sin Fines Lucrativos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código Postal *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={codigoPostal}
                    onChange={(e) => setCodigoPostal(e.target.value)}
                    placeholder="54090"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Serie Timbrado *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={serie}
                    onChange={(e) => setSerie(e.target.value.toUpperCase())}
                    placeholder="F"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Credenciales de Factura.com */}
              <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4 text-blue-600" />
                    Credenciales Factura.com de esta cuenta
                  </span>
                  <span className="text-[10px] text-blue-700">API v4 CFDI 4.0</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      API Key (Factura.com)
                    </label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="fap_live_..."
                      className="w-full px-3 py-1.5 border rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Secret Key (Factura.com)
                    </label>
                    <input
                      type="password"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder={editingEmpresa?.hasSecretKey ? "•••••••• (sin cambios)" : "Secret Key"}
                      className="w-full px-3 py-1.5 border rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <label className="font-semibold text-slate-700 text-xs">Ambiente:</label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="ambiente"
                      value="production"
                      checked={ambiente === "production"}
                      onChange={(e) => setAmbiente(e.target.value)}
                    />
                    <span>Producción</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="ambiente"
                      value="sandbox"
                      checked={ambiente === "sandbox"}
                      onChange={(e) => setAmbiente(e.target.value)}
                    />
                    <span>Sandbox (Pruebas)</span>
                  </label>
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Color distintivo en la barra superior
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`h-7 w-7 rounded-lg ${c.bg} flex items-center justify-center transition-all ${
                        color === c.id ? "ring-2 ring-offset-2 ring-slate-800 scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                      title={c.label}
                    >
                      {color === c.id && <Check className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>{editingEmpresa ? "Actualizar Empresa" : "Guardar Nueva Empresa"}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-slate-50/70 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            Cada empresa tiene su propia serie, clientes y credenciales PAC aisladas.
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
