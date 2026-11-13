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
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  UploadCloud,
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
  const [clientToEdit, setClientToEdit] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Action messages (edit/delete)
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

  const handleSyncFacturaCom = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/clientes/sync-facturacom", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al importar desde Factura.com");
      }

      setSyncResult({
        success: true,
        message: data.mensaje || "Clientes importados con éxito.",
      });

      await fetchClientes();
      if (onClientUpdated) onClientUpdated();
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || "Error al conectar con Factura.com.",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handlePushFacturaCom = async () => {
    setPushing(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/clientes/push-facturacom", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al enviar clientes a Factura.com");
      }

      setSyncResult({
        success: true,
        message: data.mensaje || "Base de datos sincronizada con Factura.com con éxito.",
      });

      await fetchClientes();
      if (onClientUpdated) onClientUpdated();
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || "Error al conectar con Factura.com.",
      });
    } finally {
      setPushing(false);
    }
  };

  const handleOpenCreate = () => {
    setClientToEdit(null);
    setIsNewClientOpen(true);
  };

  const handleOpenEdit = (cliente: any) => {
    setClientToEdit(cliente);
    setIsNewClientOpen(true);
  };

  const handleDeleteClient = async (cliente: any) => {
    if (
      !window.confirm(
        `¿Confirmas que deseas eliminar al cliente "${cliente.razonSocial}" (${cliente.rfc})? Esta acción lo desvinculará de borradores no timbrados.`
      )
    ) {
      return;
    }

    setDeletingId(cliente.id);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/clientes?id=${encodeURIComponent(cliente.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo eliminar el cliente.");
      }

      setClientes((prev) => prev.filter((c) => c.id !== cliente.id));
      setActionMessage({
        type: "success",
        text: `Cliente "${cliente.razonSocial}" eliminado correctamente.`,
      });
      if (onClientUpdated) onClientUpdated();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: err.message || "Error al eliminar el cliente.",
      });
    } finally {
      setDeletingId(null);
    }
  };

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

          {/* Sync Result Banner */}
          {syncResult && (
            <div
              className={`px-5 py-2.5 text-xs flex items-center justify-between gap-2 border-b ${
                syncResult.success
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {syncResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                )}
                <span>{syncResult.message}</span>
              </div>
              <button
                onClick={() => setSyncResult(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Action Message Banner */}
          {actionMessage && (
            <div
              className={`px-5 py-2.5 text-xs flex items-center justify-between gap-2 border-b ${
                actionMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {actionMessage.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                )}
                <span>{actionMessage.text}</span>
              </div>
              <button
                onClick={() => setActionMessage(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Action Bar & Search */}
          <div className="p-4 border-b bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por RFC o nombre..."
                className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handlePushFacturaCom}
                disabled={pushing || syncing}
                title="Enviar y actualizar todos los clientes de tu sistema a Factura.com"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-blue-200 hover:border-blue-400 bg-blue-50/70 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
              >
                <UploadCloud className={`h-3.5 w-3.5 ${pushing ? "animate-bounce text-blue-600" : ""}`} />
                <span>{pushing ? "Enviando..." : "Enviar BD a Factura.com"}</span>
              </button>

              <button
                onClick={handleSyncFacturaCom}
                disabled={syncing || pushing}
                title="Descargar clientes registrados en tu cuenta de Factura.com"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-slate-600" : ""}`} />
                <span>{syncing ? "Importando..." : "Importar de Factura.com"}</span>
              </button>

              <button
                onClick={handleOpenCreate}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Alta de Cliente</span>
              </button>
            </div>
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
                  Sincroniza los clientes de tu cuenta de Factura.com o registra uno nuevo con su Constancia Fiscal.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={handleSyncFacturaCom}
                    disabled={syncing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Sincronizar Factura.com
                  </button>
                  <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Alta de cliente
                  </button>
                </div>
              </div>
            ) : (
              clientes.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-blue-300 hover:bg-blue-50/20 transition-all flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{c.razonSocial}</span>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {c.rfc}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        CP: <strong className="text-slate-700">{c.codigoPostal}</strong>
                      </span>
                      <span>Régimen: <b className="text-slate-700 font-medium">{c.regimenFiscal}</b></span>
                      <span>Uso CFDI: <b className="text-blue-700 font-medium">{c.usoCfdiDefault || "G03"}</b></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 hidden sm:inline-block">
                      CFDI 4.0 ✓
                    </span>
                    <button
                      onClick={() => handleOpenEdit(c)}
                      title="Editar cliente"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(c)}
                      disabled={deletingId === c.id}
                      title="Eliminar cliente"
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
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
        onClose={() => {
          setIsNewClientOpen(false);
          setClientToEdit(null);
        }}
        clientToEdit={clientToEdit}
        onClientCreated={(newClient) => {
          setClientes((prev) => [newClient, ...prev]);
          setActionMessage({
            type: "success",
            text: `Cliente "${newClient.razonSocial}" registrado correctamente.`,
          });
          if (onClientUpdated) onClientUpdated();
        }}
        onClientUpdated={(updatedClient) => {
          setClientes((prev) =>
            prev.map((c) => (c.id === updatedClient.id ? updatedClient : c))
          );
          setActionMessage({
            type: "success",
            text: `Cliente "${updatedClient.razonSocial}" actualizado correctamente.`,
          });
          if (onClientUpdated) onClientUpdated();
        }}
      />
    </>
  );
}
