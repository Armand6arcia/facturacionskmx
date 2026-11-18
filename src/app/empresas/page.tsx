"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  Shield,
  ExternalLink,
  CheckCircle,
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

const COLOR_OPTIONS = [
  { id: "blue", label: "Azul", bg: "bg-blue-600", dot: "bg-blue-500", border: "border-blue-600", light: "bg-blue-50 text-blue-700" },
  { id: "indigo", label: "Índigo", bg: "bg-indigo-600", dot: "bg-indigo-500", border: "border-indigo-600", light: "bg-indigo-50 text-indigo-700" },
  { id: "emerald", label: "Esmeralda", bg: "bg-emerald-600", dot: "bg-emerald-500", border: "border-emerald-600", light: "bg-emerald-50 text-emerald-700" },
  { id: "purple", label: "Púrpura", bg: "bg-purple-600", dot: "bg-purple-500", border: "border-purple-600", light: "bg-purple-50 text-purple-700" },
  { id: "amber", label: "Ámbar", bg: "bg-amber-600", dot: "bg-amber-500", border: "border-amber-600", light: "bg-amber-50 text-amber-700" },
];

export default function EmpresasPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
      setErrorMsg("Error al obtener las empresas emisoras.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((d) => {
        if (!d.authenticated || d.user?.rol !== "ADMIN") {
          window.location.href = "/";
        } else {
          setCurrentUser(d.user);
          fetchEmpresas();
        }
      })
      .catch(() => {
        window.location.href = "/";
      });
  }, []);

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
    setErrorMsg(null);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setErrorMsg(null);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
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
        throw new Error(data.error || "Error al procesar la empresa.");
      }

      setSuccessMsg(data.mensaje || "Empresa guardada exitosamente.");
      setIsFormOpen(false);
      await fetchEmpresas();
      window.dispatchEvent(new CustomEvent("empresaChanged"));
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar empresa");
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
      window.dispatchEvent(new CustomEvent("empresaChanged"));
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al eliminar empresa");
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4 sm:px-6 pt-4">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-blue-600" />
            Gestión de Empresas y Perfiles Factura.com
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administra tus cuentas emisoras, llaves API, series de timbrado y datos fiscales independientes.
          </p>
        </div>

        {!isFormOpen && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all self-start sm:self-center"
          >
            <Plus className="h-4 w-4" />
            Nueva Empresa
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-800 text-xs font-semibold animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulario de Creación / Edición (En página, sin cortes de altura) */}
      {isFormOpen && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {editingEmpresa ? `Editar Perfil: ${editingEmpresa.nombreCorto}` : "Registrar Nueva Empresa / Perfil"}
                </h2>
                <p className="text-xs text-slate-500">
                  Ingresa los datos fiscales oficiales y las credenciales de Factura.com para esta empresa.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Fila 1: Nombre Corto y RFC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nombre Corto <span className="text-rose-500">*</span>{" "}
                  <span className="font-normal text-slate-400">(Aparece en el selector superior)</span>
                </label>
                <input
                  type="text"
                  required
                  value={nombreCorto}
                  onChange={(e) => setNombreCorto(e.target.value)}
                  placeholder="Ej. StyleKorean MX"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  RFC del Emisor <span className="text-rose-500">*</span>{" "}
                  <span className="font-normal text-slate-400">(12 car. Morales, 13 Físicas)</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={13}
                  value={rfc}
                  onChange={(e) => setRfc(e.target.value.toUpperCase())}
                  placeholder="SMX250408I48"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Fila 2: Razón Social */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Razón Social Oficial <span className="text-rose-500">*</span>{" "}
                <span className="font-normal text-slate-400">(Exactamente como en la Constancia del SAT)</span>
              </label>
              <input
                type="text"
                required
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value.toUpperCase())}
                placeholder="STYLE KOREAN MEXICO S.A. DE C.V."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              />
            </div>

            {/* Fila 3: Régimen, Código Postal y Serie */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Régimen Fiscal <span className="text-rose-500">*</span>
                </label>
                <select
                  value={regimenFiscal}
                  onChange={(e) => setRegimenFiscal(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="601">601 - General de Ley Personas Morales</option>
                  <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                  <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                  <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                  <option value="625">625 - Régimen de las Actividades Empresariales con Plataformas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Código Postal Fiscal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={codigoPostal}
                  onChange={(e) => setCodigoPostal(e.target.value)}
                  placeholder="54090"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Serie por Defecto <span className="text-rose-500">*</span>{" "}
                  <span className="font-normal text-slate-400">(Registrada en Factura.com)</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={serie}
                  onChange={(e) => setSerie(e.target.value.toUpperCase())}
                  placeholder="F"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Credenciales Factura.com */}
            <div className="p-5 rounded-2xl border border-blue-200/80 bg-blue-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-blue-600" />
                  Credenciales de API Factura.com para esta empresa
                </span>
                <span className="text-[10px] font-semibold text-blue-700 px-2 py-0.5 rounded bg-blue-100">
                  CFDI 4.0 API v4
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    F-Api-Key
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="JDJ5JDEwJDl1N01SVWhX..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    F-Secret-Key
                  </label>
                  <input
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder={editingEmpresa?.hasSecretKey ? "•••••••• (sin cambios)" : "Secret Key de Factura.com"}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs pt-1">
                <span className="font-semibold text-slate-700">Ambiente de timbrado:</span>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="radio"
                    name="ambiente"
                    value="production"
                    checked={ambiente === "production"}
                    onChange={(e) => setAmbiente(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Producción (Oficial SAT)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="radio"
                    name="ambiente"
                    value="sandbox"
                    checked={ambiente === "sandbox"}
                    onChange={(e) => setAmbiente(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Sandbox (Pruebas)</span>
                </label>
              </div>
            </div>

            {/* Selector de Color Distintivo */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Color Distintivo <span className="font-normal text-slate-400">(Para identificarla fácilmente en el selector superior y en cada factura)</span>
              </label>
              <div className="flex items-center gap-3">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`h-9 w-9 rounded-xl ${c.bg} flex items-center justify-center transition-all ${
                      color === c.id ? "ring-4 ring-offset-2 ring-slate-800 scale-105" : "opacity-80 hover:opacity-100"
                    }`}
                    title={c.label}
                  >
                    {color === c.id && <Check className="h-4 w-4 text-white font-bold" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="pt-4 border-t flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>{editingEmpresa ? "Actualizar Empresa" : "Guardar Nueva Empresa"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Listado de Empresas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Empresas Emisoras Registradas ({empresas.length} perfiles)
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 bg-white rounded-3xl border border-slate-200">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Cargando empresas emisoras...</span>
          </div>
        ) : empresas.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 p-8">
            <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-sm">No hay empresas registradas</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Registra tu primera empresa para comenzar a emitir comprobantes fiscales.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <Plus className="h-4 w-4" /> Registrar Empresa
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {empresas.map((emp) => {
              const colorCfg =
                COLOR_OPTIONS.find((c) => c.id === emp.color) || COLOR_OPTIONS[0];

              return (
                <div
                  key={emp.id}
                  className="p-5 sm:p-6 rounded-3xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div
                      className={`h-12 w-12 rounded-2xl ${colorCfg.bg} text-white font-bold flex items-center justify-center text-base shadow-xs shrink-0`}
                    >
                      {emp.nombreCorto.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-base">
                          {emp.nombreCorto}
                        </span>
                        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                          {emp.rfc}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md border bg-slate-50 text-slate-700">
                          Serie: <b>{emp.serie}</b>
                        </span>
                        {emp.ambiente === "sandbox" && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            Sandbox (Pruebas)
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-600 truncate">{emp.razonSocial}</p>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500 pt-0.5">
                        <span>C.P. Fiscal: <b>{emp.codigoPostal}</b></span>
                        <span>Régimen: <b>{emp.regimenFiscal}</b></span>
                        {emp.apiKey ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <KeyRound className="h-3.5 w-3.5 text-emerald-600" /> API Key Conectada
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">Sin API Key propia</span>
                        )}
                        {emp._count && (
                          <span className="text-slate-400">
                            <b>{emp._count.documentos}</b> CFDI timbrados · <b>{emp._count.clientes}</b> clientes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleOpenEdit(emp)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                      title="Editar datos y credenciales"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </button>
                    {empresas.length > 1 && (
                      <button
                        onClick={() => handleDelete(emp)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Desactivar empresa"
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
      </div>
    </div>
  );
}
