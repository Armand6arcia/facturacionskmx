"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Settings,
  Shield,
  Loader2,
} from "lucide-react";
import { CompaniesModal } from "./companies-modal";

interface Empresa {
  id: string;
  nombreCorto: string;
  razonSocial: string;
  rfc: string;
  serie: string;
  color?: string;
  activa: boolean;
}

interface CompanySelectorProps {
  isAdmin?: boolean;
}

const COLOR_MAP: Record<string, { bg: string; dot: string; text: string; light: string }> = {
  blue: { bg: "bg-blue-600", dot: "bg-blue-500", text: "text-blue-700", light: "bg-blue-50" },
  indigo: { bg: "bg-indigo-600", dot: "bg-indigo-500", text: "text-indigo-700", light: "bg-indigo-50" },
  emerald: { bg: "bg-emerald-600", dot: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-50" },
  purple: { bg: "bg-purple-600", dot: "bg-purple-500", text: "text-purple-700", light: "bg-purple-50" },
  amber: { bg: "bg-amber-600", dot: "bg-amber-500", text: "text-amber-700", light: "bg-amber-50" },
};

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`;
}

export function CompanySelector({ isAdmin = false }: CompanySelectorProps) {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [activeEmpresa, setActiveEmpresa] = useState<Empresa | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchEmpresas = async () => {
    try {
      const res = await fetch("/api/empresas");
      const data = await res.json();
      if (data.empresas && Array.isArray(data.empresas)) {
        setEmpresas(data.empresas);

        // Resolver empresa activa
        const savedId = getCookie("sk_active_empresa_id") || localStorage.getItem("sk_active_empresa_id");
        const match = data.empresas.find((e: Empresa) => e.id === savedId);
        const selected = match || data.empresas[0] || null;
        setActiveEmpresa(selected);

        if (selected && (!savedId || savedId !== selected.id)) {
          setCookie("sk_active_empresa_id", selected.id);
          localStorage.setItem("sk_active_empresa_id", selected.id);
        }
      }
    } catch (e) {
      console.error("Error al cargar empresas:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();

    const onUpdate = () => fetchEmpresas();
    window.addEventListener("empresaChanged", onUpdate);
    window.addEventListener("empresasUpdated", onUpdate);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("empresaChanged", onUpdate);
      window.removeEventListener("empresasUpdated", onUpdate);
    };
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      fetchEmpresas();
    }
    setIsOpen(!isOpen);
  };

  const handleSelectEmpresa = (emp: Empresa) => {
    if (activeEmpresa?.id === emp.id) {
      setIsOpen(false);
      return;
    }

    setActiveEmpresa(emp);
    setCookie("sk_active_empresa_id", emp.id);
    localStorage.setItem("sk_active_empresa_id", emp.id);
    setIsOpen(false);

    // Disparar evento y recargar para sincronizar estado global
    window.dispatchEvent(new CustomEvent("empresaChanged", { detail: emp }));
    window.location.reload();
  };

  if (loading && !activeEmpresa) {
    return (
      <div className="h-9 px-3 rounded-xl border bg-slate-50 flex items-center gap-2 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="hidden sm:inline">Cargando perfil...</span>
      </div>
    );
  }

  if (empresas.length === 0) {
    return null;
  }

  const activeColor = COLOR_MAP[activeEmpresa?.color || "blue"] || COLOR_MAP.blue;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 shadow-xs transition-all text-xs font-semibold text-slate-800"
          title={`Empresa emisora activa: ${activeEmpresa?.nombreCorto || "Seleccionar"}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${activeColor.dot} shrink-0`} />
          <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0 hidden sm:inline" />
          <span className="max-w-[130px] sm:max-w-[180px] truncate font-bold text-slate-900">
            {activeEmpresa?.nombreCorto || "Seleccionar Empresa"}
          </span>
          <span className="hidden md:inline font-mono text-[10px] text-slate-400">
            ({activeEmpresa?.rfc || ""})
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 rounded-2xl bg-white shadow-xl border border-slate-100 z-50 p-2 space-y-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b">
              Cambiar Cuenta Emisora ({empresas.length} disponibles)
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 py-1">
              {empresas.map((emp) => {
                const isSelected = activeEmpresa?.id === emp.id;
                const empColor = COLOR_MAP[emp.color || "blue"] || COLOR_MAP.blue;

                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelectEmpresa(emp)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? "bg-slate-100/90 text-slate-900 font-semibold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className={`h-2.5 w-2.5 rounded-full ${empColor.dot} shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate text-slate-900">
                          {emp.nombreCorto}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate">
                          {emp.rfc} · Serie: {emp.serie}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {isAdmin && (
              <div className="pt-1.5 border-t mt-1">
                <Link
                  href="/empresas"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 flex items-center gap-2 transition-all"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Gestionar Empresas y API Keys</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <CompaniesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onEmpresasUpdated={fetchEmpresas}
      />
    </>
  );
}

