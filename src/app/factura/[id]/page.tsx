"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Download,
  Printer,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Building,
  Calendar,
  FileCode,
  ShieldCheck,
  QrCode,
  Truck,
  RotateCcw,
} from "lucide-react";

export default function FacturaPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [documento, setDocumento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState("02");
  const [folioSustitucion, setFolioSustitucion] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [cancelMensaje, setCancelMensaje] = useState<string | null>(null);

  const fetchDoc = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/documentos/${docId}`);
      if (!res.ok) throw new Error("Documento no encontrado");
      const data = await res.json();
      setDocumento(data.documento);
    } catch (e: any) {
      setError(e.message || "Error al cargar la factura.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (docId) fetchDoc();
  }, [docId]);

  // Download XML file
  const handleDownloadXml = () => {
    if (!documento?.timbre?.xmlContent) return;
    const blob = new Blob([documento.timbre.xmlContent], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CFDI_${documento.timbre.uuid}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Cancel CFDI
  const handleCancelCfdi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documento?.timbre?.uuid) return;
    setCancelando(true);

    try {
      const res = await fetch("/api/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uuid: documento.timbre.uuid,
          motivo: motivoCancelacion,
          folioSustitucion: motivoCancelacion === "01" ? folioSustitucion : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cancelar comprobante");

      setCancelMensaje(data.mensaje);
      setIsCancelModalOpen(false);
      fetchDoc();
    } catch (err: any) {
      alert(err.message || "Error al cancelar");
    } finally {
      setCancelando(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Generando vista del CFDI 4.0...</p>
      </div>
    );
  }

  if (error || !documento) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-red-600 font-bold">{error || "Factura no encontrada"}</p>
        <Link href="/" className="text-blue-600 underline text-sm">
          Volver a inicio
        </Link>
      </div>
    );
  }

  const timbre = documento.timbre;
  const isCancelado = documento.estado === "CANCELADO" || timbre?.estado === "CANCELADO";

  let datosCartaPorte: any = null;
  if (documento.tipoFactura === "TRASLADO" && documento.datosCartaPorte) {
    try {
      datosCartaPorte = JSON.parse(documento.datosCartaPorte);
    } catch (e) {}
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/revisar/${docId}`}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Volver a la revisión"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className="font-extrabold text-base text-slate-900">
              Comprobante Fiscal Digital por Internet (CFDI 4.0)
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500">Folio: {documento.serie}-{documento.folio}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isCancelado
                    ? "bg-red-100 text-red-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {isCancelado ? "CANCELADO" : "VIGENTE"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadXml}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Download className="h-4 w-4" />
            Descargar XML 4.0
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Printer className="h-4 w-4" />
            Imprimir / Guardar PDF
          </button>

          {!isCancelado && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition"
            >
              <XCircle className="h-4 w-4" />
              Cancelar CFDI (Simulado)
            </button>
          )}
        </div>
      </div>

      {cancelMensaje && (
        <div className="no-print p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>{cancelMensaje}</span>
        </div>
      )}

      {/* Printable Invoice Container */}
      <div className="relative bg-white rounded-2xl border shadow-md p-8 sm:p-12 overflow-hidden text-slate-800">

        {/* Cancellation Stamp Banner if cancelled */}
        {isCancelado && (
          <div className="mb-6 p-4 bg-red-600 text-white text-center font-extrabold tracking-wider uppercase text-sm rounded-xl shadow-sm">
            *** COMPROBANTE CANCELADO (SIMULADO EN AMBIENTE DEMO) ***
          </div>
        )}

        {/* Header: Emisor & Folio */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-8 border-b pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 bg-blue-600 text-white font-bold rounded flex items-center justify-center text-sm">
                SK
              </div>
              <h2 className="font-extrabold text-lg text-slate-900 leading-tight">
                SKINCARE MEXICO DISTRIBUTION S.A. DE C.V.
              </h2>
            </div>
            <div className="text-xs text-slate-600 space-y-0.5">
              <p><b>RFC Emisor:</b> SKM220101AA1</p>
              <p><b>Régimen Fiscal:</b> 601 - General de Ley Personas Morales</p>
              <p><b>Lugar de Expedición:</b> C.P. 06600, Ciudad de México</p>
              <p><b>Efecto de comprobante:</b> {documento.tipoFactura === "TRASLADO" ? "T - Traslado" : "I - Ingreso"}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border text-xs space-y-1 sm:text-right">
            <div className="text-sm font-extrabold text-blue-900">
              FACTURA ELECTRÓNICA CFDI 4.0
            </div>
            <p><b>Serie y Folio:</b> {documento.serie}-{documento.folio}</p>
            <p><b>No. Documento Origen:</b> {documento.docNumber}</p>
            <p>
              <b>Folio Fiscal (UUID):</b><br />
              <span className="font-mono text-[11px] font-bold text-slate-900 break-all">
                {timbre?.uuid || "N/A - PENDIENTE"}
              </span>
            </p>
            <p><b>No. Serie CSD del SAT:</b> {timbre?.noCertificadoSat || "00001000000504465028"}</p>
            <p><b>Fecha y Hora de Certificación:</b> {timbre?.fechaTimbrado ? new Date(timbre.fechaTimbrado).toLocaleString("es-MX") : new Date().toLocaleString("es-MX")}</p>
          </div>
        </div>

        {/* Receptor & Payment Details */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-8 py-6 border-b text-xs">
          <div>
            <h3 className="font-bold uppercase tracking-wider text-slate-400 text-[11px] mb-2">
              Datos del Receptor
            </h3>
            <div className="space-y-1 text-slate-700">
              <p className="font-bold text-sm text-slate-900">
                {documento.nombreReceptor || documento.cliente?.razonSocial || "PUBLICO EN GENERAL"}
              </p>
              <p><b>RFC:</b> {documento.rfcReceptor || documento.cliente?.rfc || "XAXX010101000"}</p>
              <p><b>Domicilio Fiscal (C.P.):</b> {documento.cpReceptor || documento.cliente?.codigoPostal || "06600"}</p>
              <p><b>Régimen Fiscal:</b> {documento.regimenReceptor || documento.cliente?.regimenFiscal || "616"}</p>
              <p><b>Uso CFDI:</b> {documento.usoCfdi || documento.cliente?.usoCfdiDefault || "G03"}</p>
            </div>
          </div>

          <div>
            <h3 className="font-bold uppercase tracking-wider text-slate-400 text-[11px] mb-2">
              Condiciones de Pago
            </h3>
            <div className="space-y-1 text-slate-700">
              <p><b>Forma de Pago:</b> {documento.formaPago} - Transferencia electrónica</p>
              <p><b>Método de Pago:</b> {documento.metodoPago} - Pago en una sola exhibición</p>
              <p><b>Moneda:</b> MXN - Peso Mexicano</p>
              <p><b>Exportación:</b> {documento.tipoFactura === "GLOBAL_EXTRANJERO" ? "02 - Definitiva" : "01 - No aplica"}</p>
            </div>
          </div>
        </div>

        {/* Complemento Carta Porte (if applicable) */}
        {datosCartaPorte && (
          <div className="relative z-10 py-6 border-b bg-blue-50/50 -mx-8 px-8 sm:-mx-12 sm:px-12">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-5 w-5 text-blue-700" />
              <h3 className="font-bold text-blue-900 text-xs sm:text-sm uppercase tracking-wider">
                Complemento Carta Porte Versión 3.1 (CFDI de Traslado)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
              <div>
                <p><b>Origen:</b> {datosCartaPorte.origen}</p>
                <p><b>Destino:</b> {datosCartaPorte.destino}</p>
                <p><b>Distancia Recorrida:</b> {datosCartaPorte.distanciaKm} km</p>
              </div>
              <div>
                <p><b>Vehículo:</b> {datosCartaPorte.vehiculo} (Placas: <span className="font-mono font-bold">{datosCartaPorte.placas}</span>)</p>
                <p><b>Operador:</b> {datosCartaPorte.operador} (RFC: <span className="font-mono">{datosCartaPorte.rfcOperador}</span>)</p>
                <p><b>Peso Bruto Total:</b> {documento.pesoTotalKg} kg (con embalaje)</p>
              </div>
            </div>
          </div>
        )}

        {/* Lines Table */}
        <div className="relative z-10 py-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-300 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                <th className="pb-2">Clave SAT</th>
                <th className="pb-2">SKU</th>
                <th className="pb-2">Descripción</th>
                <th className="pb-2 text-right">Cant.</th>
                <th className="pb-2 text-right">Precio Unit.</th>
                <th className="pb-2 text-right">IVA (16%)</th>
                <th className="pb-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documento.items
                .filter((i: any) => !i.excluido)
                .map((it: any) => (
                  <tr key={it.id} className="py-2">
                    <td className="py-2 font-mono text-slate-500">{it.claveProdServ || "53131600"}</td>
                    <td className="py-2 font-mono font-semibold">{it.sku}</td>
                    <td className="py-2 text-slate-800">{it.descripcion}</td>
                    <td className="py-2 text-right font-mono">{it.cantidad}</td>
                    <td className="py-2 text-right font-mono">${it.precioUnitario.toFixed(2)}</td>
                    <td className="py-2 text-right font-mono">${it.iva.toFixed(2)}</td>
                    <td className="py-2 text-right font-mono font-bold">${it.base.toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="relative z-10 border-t pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs">
          <div className="max-w-xs text-slate-500 space-y-1">
            <p><b>Total con letra:</b></p>
            <p className="italic uppercase font-medium text-slate-700">
              ** Cuarenta y ocho mil setecientos... (Importe total en Moneda Nacional M.N.) **
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-2 border-t sm:border-t-0 pt-2 sm:pt-0">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">${documento.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>IVA Trasladado (16%):</span>
              <span className="font-mono font-semibold">${documento.iva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-sm text-slate-900 border-t pt-2">
              <span>TOTAL:</span>
              <span className="font-mono text-base">${documento.total.toFixed(2)} MXN</span>
            </div>
          </div>
        </div>

        {/* Footer: Fiscal Signatures, QR and Cadena Original */}
        <div className="relative z-10 mt-8 pt-6 border-t border-dashed border-slate-300 grid grid-cols-1 sm:grid-cols-12 gap-6 text-[10px] text-slate-500">
          {/* Simulated QR Code box */}
          <div className="sm:col-span-2 flex flex-col items-center justify-center p-3 border rounded-xl bg-slate-50">
            <QrCode className="h-20 w-20 text-slate-800" />
            <span className="text-[9px] text-slate-400 mt-1 font-mono">https://sat.gob.mx</span>
          </div>

          {/* Sello Digital CFD, Sello SAT, Cadena Original */}
          <div className="sm:col-span-10 space-y-2">
            <div>
              <b className="text-slate-700">Sello Digital del CFDI (Simulado DEMO):</b>
              <p className="font-mono break-all text-[9px] text-slate-600 mt-0.5">
                {timbre?.selloCfd || "DEMO_SELLO_CFD_SHA256_MOCK_PAC_CLIENT"}
              </p>
            </div>

            <div>
              <b className="text-slate-700">Sello del SAT:</b>
              <p className="font-mono break-all text-[9px] text-slate-600 mt-0.5">
                {timbre?.selloSat || "DEMO_SELLO_SAT_SHA256_MOCK_PAC_CLIENT"}
              </p>
            </div>

            <div>
              <b className="text-slate-700">Cadena Original del Complemento de Certificación Digital del SAT:</b>
              <p className="font-mono break-all text-[9px] text-slate-600 mt-0.5">
                {timbre?.cadenaOriginal || "||1.1|UUID|2026-11-04|DEMO010101000||"}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-center mt-6 pt-4 border-t text-[11px] text-slate-400">
          ESTE DOCUMENTO ES UNA REPRESENTACIÓN IMPRESA DE UN CFDI VERSIÓN 4.0 • SISTEMA DEMOSTRATIVO SIN VALIDEZ OFICIAL
        </div>
      </div>

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border">
            <div className="px-6 py-4 bg-red-600 text-white font-bold text-sm flex items-center justify-between">
              <span>Cancelar Comprobante Fiscal (Simulado)</span>
              <button onClick={() => setIsCancelModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCancelCfdi} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Selecciona el motivo de cancelación conforme al estándar del SAT:
              </p>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Motivo de Cancelación</label>
                <select
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="02">02 - Comprobante emitido con errores sin relación</option>
                  <option value="01">01 - Comprobante emitido con errores con relación</option>
                  <option value="03">03 - No se llevó a cabo la operación</option>
                  <option value="04">04 - Operación nominativa relacionada en factura global</option>
                </select>
              </div>

              {motivoCancelacion === "01" && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Folio Fiscal de Sustitución (UUID sustituto)
                  </label>
                  <input
                    type="text"
                    required
                    value={folioSustitucion}
                    onChange={(e) => setFolioSustitucion(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
                  />
                </div>
              )}

              <div className="pt-3 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={cancelando}
                  className="px-5 py-2 bg-red-600 text-white font-bold rounded-lg shadow-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelando ? "Cancelando..." : "Confirmar Cancelación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

