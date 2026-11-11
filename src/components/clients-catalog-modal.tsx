"use client";

import { useState, useEffect } from "react";
import {
  X,
  Users,
  Search,
  Plus,
  FileUp,
  Building2,
  MapPin,
  FileText,
  Loader2,
} from "lucide-react";
import { NewClientModal } from "./new-client-modal";

interface ClientsCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientUpdated?: () => void;
}

export function ClientsCatalogModal({
  isOpen,
  onClose,
  onClientUpdated,
}: ClientsCatalogModalProps) {
  const [clientes, setClientes] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clientes?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.clientes) {
        setClientes(data.clientes);
      }
    } catch (e) {
      console.error("Error al cargar clientes", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchClientes();
    }
  }, [isOpen, query]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Catálogo de Clientes</h3>
                <p className="text-xs text-slate-500">Receptores fiscales registrados para CFDI 4.0</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Action Bar & Search */}
          <div className="p-4 border-b bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por RFC o nombre..."
                className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>

            <button
              onClick={() => setIsNewClientOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all"
            >
              <FileUp className="h-4 w-4" />
              <span>Subir Constancia Fiscal (PDF)</span>
            </button>
          </div>

          {/* List */}
          <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-xs">Cargando catálogo de clientes...</span>
              </div>
            ) : clientes.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No se encontraron clientes</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Puedes dar de alta clientes al instante subiendo su Constancia de Situación Fiscal del SAT.
                </p>
                <button
                  onClick={() => setIsNewClientOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  Alta de cliente
                </button>
              </div>
            ) : (
              clientes.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-blue-300 hover:bg-blue-50/20 transition-all flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{c.razonSocial}</span>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {c.rfc}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        CP: {c.codigoPostal}
                      </span>
                      <span>Régimen: <b className="text-slate-700 font-medium">{c.regimenFiscal}</b></span>
                      <span>Uso CFDI: <b className="text-slate-700 font-medium">{c.usoCfdiDefault}</b></span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                    CFDI 4.0 ✓
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t bg-slate-50/70 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span>Total: <b>{clientes.length}</b> cliente(s)</span>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <NewClientModal
        isOpen={isNewClientOpen}
        onClose={() => setIsNewClientOpen(false)}
        onClientCreated={(newClient) => {
          setClientes((prev) => [newClient, ...prev]);
          if (onClientUpdated) onClientUpdated();
        }}
      />
    </>
  );
}

