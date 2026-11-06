"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  FileText,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function HistorialPage() {
  const [tab, setTab] = useState<"DOCUMENTOS" | "BITACORA">("DOCUMENTOS");
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [bitacora, setBitacora] = useState<any[]>([]);
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (estadoFilter !== "TODOS") params.set("estado", estadoFilter);
      if (searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/historial?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocumentos(data.documentos || []);
        setBitacora(data.bitacora || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [estadoFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Historial de Facturación y Bitácora
            </h1>
            <p className="text-xs text-slate-500">
              Control de documentos procesados, CFDI 4.0 timbrados y registro de auditoría.
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setTab("DOCUMENTOS")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            tab === "DOCUMENTOS"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="h-4 w-4" />
          Comprobantes ({documentos.length})
        </button>
        <button
          onClick={() => setTab("BITACORA")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            tab === "BITACORA"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="h-4 w-4" />
          Bitácora de Eventos ({bitacora.length})
        </button>
      </div>

      {/* TAB 1: DOCUMENTOS */}
      {tab === "DOCUMENTOS" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por documento, cliente o UUID..."
                className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </form>

            <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Estado:
              </span>
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="px-2.5 py-1.5 border rounded-lg text-xs bg-white text-slate-700 font-medium"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="TIMBRADO">Timbrado</option>
                <option value="BORRADOR">Borrador</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-500">
                Cargando comprobantes...
              </div>
            ) : documentos.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                <p>No se encontraron documentos registrados.</p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-blue-600 font-semibold hover:underline"
                >
                  Cargar un nuevo comprobante <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/70 text-slate-700 border-b">
                    <tr>
                      <th className="py-3 px-4 font-semibold">No. Documento</th>
                      <th className="py-3 px-4 font-semibold">Receptor</th>
                      <th className="py-3 px-4 font-semibold">Tipo</th>
                      <th className="py-3 px-4 font-semibold">Fecha Emisión</th>
                      <th className="py-3 px-4 font-semibold text-right">Total MXN</th>
                      <th className="py-3 px-4 font-semibold text-center">Estado</th>
                      <th className="py-3 px-4 font-semibold">UUID Fiscal</th>
                      <th className="py-3 px-4 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {documentos.map((d) => {
                      const isTimbrado = d.estado === "TIMBRADO";
                      const isCancelado = d.estado === "CANCELADO";

                      return (
                        <tr key={d.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                            {d.docNumber}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">
                              {d.nombreReceptor || d.cliente?.razonSocial || "PUBLICO EN GENERAL"}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {d.rfcReceptor || d.cliente?.rfc || "XAXX010101000"}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              {d.tipoFactura}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {new Date(d.fechaEmision).toLocaleDateString("es-MX")}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ${d.total.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                isTimbrado
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isCancelado
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {d.estado}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-[140px] truncate">
                            {d.timbre?.uuid ? (
                              <span title={d.timbre.uuid}>{d.timbre.uuid.slice(0, 16)}...</span>
                            ) : (
                              <span className="italic text-slate-400">Sin timbrar</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isTimbrado || isCancelado ? (
                              <Link
                                href={`/factura/${d.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-semibold transition"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Ver CFDI
                              </Link>
                            ) : (
                              <Link
                                href={`/revisar/${d.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-md font-semibold transition"
                              >
                                Revisar
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BITACORA DE EVENTOS */}
      {tab === "BITACORA" && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50/70">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Registro de Auditoría y Eventos del Sistema
            </h2>
            <p className="text-xs text-slate-500">
              Traza histórica de lecturas, mapeo de SKUs, llamadas al PAC y cancelaciones.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/70 text-slate-700 border-b">
                <tr>
                  <th className="py-3 px-4 font-semibold">Fecha y Hora</th>
                  <th className="py-3 px-4 font-semibold">Doc. Asociado</th>
                  <th className="py-3 px-4 font-semibold">Tipo Evento</th>
                  <th className="py-3 px-4 font-semibold">Descripción</th>
                  <th className="py-3 px-4 font-semibold">Detalles Contextuales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bitacora.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleString("es-MX")}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 font-mono">
                      {b.documento?.docNumber || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          b.tipo === "TIMBRADO"
                            ? "bg-emerald-100 text-emerald-800"
                            : b.tipo === "ERROR_PAC"
                            ? "bg-red-100 text-red-800"
                            : b.tipo === "CANCELACION"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {b.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-xs sm:max-w-md">
                      {b.descripcion}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400 max-w-xs truncate">
                      {b.detalles || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

