"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Download,
  Printer,
  XCircle,
  ArrowLeft,
  FileCode,
  FileText,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { numeroALetras } from "@/lib/tax/number-to-words";

const FORMAS_PAGO: Record<string, string> = {
  "01": "01 - Efectivo",
  "02": "02 - Cheque nominativo",
  "03": "03 - Transferencia electrónica de fondos",
  "04": "04 - Tarjeta de crédito",
  "28": "28 - Tarjeta de débito",
  "99": "99 - Por definir",
};

const METODOS_PAGO: Record<string, string> = {
  PUE: "PUE - Pago en una sola exhibición",
  PPD: "PPD - Pago en parcialidades o diferido",
};

const REGIMENES_FISCALES: Record<string, string> = {
  "601": "601 - General de Ley Personas Morales",
  "603": "603 - Personas Morales con Fines no Lucrativos",
  "605": "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios",
  "606": "606 - Arrendamiento",
  "612": "612 - Personas Físicas con Actividades Empresariales y Profesionales",
  "616": "616 - Sin obligaciones fiscales",
  "621": "621 - Incorporación Fiscal",
  "626": "626 - Régimen Simplificado de Confianza",
};

const USOS_CFDI: Record<string, string> = {
  G01: "G01 - Adquisición de mercancías",
  G02: "G02 - Devoluciones, descuentos o bonificaciones",
  G03: "G03 - Gastos en general",
  I01: "I01 - Construcciones",
  I02: "I02 - Mobiliario y equipo de oficina por inversiones",
  I04: "I04 - Equipo de cómputo y accesorios",
  S01: "S01 - Sin efectos fiscales",
  CP01: "CP01 - Pagos",
};

export default function FacturaPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [documento, setDocumento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

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

  // Generar Código QR Oficial del SAT cuando haya timbre disponible
  useEffect(() => {
    if (!documento) return;
    const timbre = documento.timbre;
    const uuid = timbre?.uuid || "";
    const emisorRfc = "SMX250408I48";
    const receptorRfc = documento.rfcReceptor || documento.cliente?.rfc || "XAXX010101000";
    const totalFormatted = (documento.total || 0).toFixed(6);
    const selloEnd = timbre?.selloCfd ? timbre.selloCfd.slice(-8) : "00000000";

    const satUrl = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuid}&re=${emisorRfc}&rr=${receptorRfc}&tt=${totalFormatted}&fe=${selloEnd}`;

    QRCode.toDataURL(satUrl, {
      margin: 1,
      width: 256,
      color: {
        dark: "#183661",
        light: "#FFFFFF",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error generando QR SAT:", err));
  }, [documento]);

  // Download XML file
  const handleDownloadXml = () => {
    window.location.href = `/api/documentos/${docId}/xml`;
  };

  // Download official PDF (Factura.com API o Imprimir)
  const handleDownloadPdf = () => {
    window.open(`/api/documentos/${docId}/pdf`, "_blank");
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
      alert(err.message || "Error al cancelar comprobante");
    } finally {
      setCancelando(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#183661] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">
          Cargando representación impresa del CFDI 4.0...
        </p>
      </div>
    );
  }

  if (error || !documento) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-red-600 font-bold">{error || "Factura no encontrada"}</p>
        <Link href="/historial" className="text-[#183661] underline text-sm font-semibold">
          Volver al Historial CFDI
        </Link>
      </div>
    );
  }

  const timbre = documento.timbre;
  const isCancelado = documento.estado === "CANCELADO" || timbre?.estado === "CANCELADO";

  const formaPagoLabel = FORMAS_PAGO[documento.formaPago] || documento.formaPago;
  const metodoPagoLabel = METODOS_PAGO[documento.metodoPago] || documento.metodoPago;
  const regimenEmisorLabel = REGIMENES_FISCALES["601"] || "601 - General de Ley Personas Morales";
  const receptorRegimen = documento.regimenReceptor || documento.cliente?.regimenFiscal || "601";
  const regimenReceptorLabel = REGIMENES_FISCALES[receptorRegimen] || `${receptorRegimen} - Régimen Fiscal`;
  const usoCfdiVal = documento.usoCfdi || documento.cliente?.usoCfdiDefault || "G01";
  const usoCfdiLabel = USOS_CFDI[usoCfdiVal] || `${usoCfdiVal} - Adquisición de mercancías`;

  const fechaExpedicionStr = documento.fechaEmision
    ? new Date(documento.fechaEmision).toISOString().slice(0, 19)
    : new Date().toISOString().slice(0, 19);

  const fechaTimbradoStr = timbre?.fechaTimbrado
    ? new Date(timbre.fechaTimbrado).toISOString().slice(0, 19)
    : fechaExpedicionStr;

  const totalEnLetras = numeroALetras(documento.total || 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/historial"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Volver al Historial"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-slate-900">
                Factura {documento.serie || "F"} {documento.folio || ""}
              </span>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                  isCancelado
                    ? "bg-red-100 text-red-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {isCancelado ? "CANCELADO" : "VIGENTE"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              CFDI 4.0 • {documento.nombreReceptor || documento.cliente?.razonSocial || "Receptor"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadXml}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            title="Descargar archivo XML timbrado"
          >
            <Download className="h-4 w-4" />
            Descargar XML 4.0
          </button>

          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#183661] hover:bg-[#122847] text-white rounded-xl text-xs font-semibold shadow-sm transition"
            title="Descargar PDF de Factura.com"
          >
            <FileText className="h-4 w-4" />
            Descargar PDF Oficial
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            title="Imprimir o guardar como PDF"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>

          {!isCancelado && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition"
            >
              <XCircle className="h-4 w-4" />
              Cancelar CFDI
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

      {/* ============================================================ */}
      {/* FACTURA FISCAL CONTAINER (IDENTICAL TO STYLEKOREAN MX PDF) */}
      {/* ============================================================ */}
      <div
        id="factura-print-area"
        className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 sm:p-12 text-slate-800 print:border-none print:shadow-none print:p-0 print:m-0"
        style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
      >
        {/* Banner de Cancelado en caso de estar cancelada */}
        {isCancelado && (
          <div className="mb-6 p-3 bg-red-600 text-white text-center font-extrabold tracking-widest uppercase text-sm rounded-xl">
            *** COMPROBANTE FISCAL CANCELADO ***
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* 1. HEADER: BRAND LOGO (LEFT) & FACTURA METADATA (RIGHT)       */}
        {/* ------------------------------------------------------------ */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6">
          {/* Logo Emisor */}
          <div className="pt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-stylekorean.png"
              alt="StyleKorean MX"
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>

          {/* Caja Factura y Metadatos */}
          <div className="w-full sm:w-[380px] text-xs">
            {/* Navy Pill "Factura" */}
            <div className="bg-[#183661] text-white font-extrabold text-center py-1.5 px-6 rounded-2xl text-base tracking-wider shadow-sm mb-3">
              Factura
            </div>

            {/* Metadatos en dos columnas */}
            <div className="space-y-1 text-slate-700 text-[11px]">
              <div className="flex justify-between">
                <span className="font-bold text-[#183661]">Tipo de Comprobante:</span>
                <span className="text-right">
                  {documento.tipoFactura === "TRASLADO" ? "T - Traslado" : "I - Ingreso"}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="font-bold text-[#183661]">Folio Fiscal:</span>
                <span className="font-mono text-[10px] text-right break-all max-w-[240px]">
                  {timbre?.uuid || "PENDIENTE"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#183661]">Fecha de Expedición:</span>
                <span className="font-mono">{fechaExpedicionStr}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#183661]">Lugar de Expedición:</span>
                <span>
                  54090{" "}
                  <span className="font-bold text-[#183661] ml-2">Exportación:</span>{" "}
                  {documento.tipoFactura === "GLOBAL_EXTRANJERO" ? "02 - Definitiva" : "No aplica"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#183661]">Cert CSD:</span>
                <span className="font-mono">
                  {timbre?.noCertificadoSat || "00001000000722399245"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#183661]">Folio interno:</span>
                <span className="font-bold">
                  {documento.serie || "F"} {documento.folio || ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#183661]">Orden/Pedido:</span>
                <span className="font-semibold">{documento.docNumber}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* 2. SECTION BANNER: DATOS DEL EMISOR                          */}
        {/* ------------------------------------------------------------ */}
        <div className="mt-2 mb-4">
          <div className="bg-[#183661] text-white font-bold text-center py-1 rounded-2xl text-xs sm:text-sm tracking-wide shadow-sm">
            Datos del Emisor
          </div>
          <div className="pt-2 px-2 text-[11px] space-y-0.5 text-slate-800">
            <p className="font-extrabold text-xs text-[#183661] uppercase tracking-wide">
              STYLEKOREAN MX
            </p>
            <p>
              <span className="font-bold text-[#183661]">RFC: </span>
              <span className="font-mono font-semibold">SMX250408I48</span>
            </p>
            <p>
              <span className="font-bold text-[#183661]">DOMICILIO FISCAL: </span>
              AV. JESUS REYES HEROLES 293 Col. UNID.MARAVILLAS CEYLAN, C.P. 54090, TLALNEPANTLA DE BAZ, TLALNEPANTLA DE BAZ, México
            </p>
            <p>
              <span className="font-bold text-[#183661]">RÉGIMEN FISCAL: </span>
              {regimenEmisorLabel}
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* 3. SECTION BANNER: DATOS DEL RECEPTOR                        */}
        {/* ------------------------------------------------------------ */}
        <div className="mt-4 mb-5">
          <div className="bg-[#183661] text-white font-bold text-center py-1 rounded-2xl text-xs sm:text-sm tracking-wide shadow-sm">
            Datos del Receptor
          </div>
          <div className="pt-2 px-2 text-[11px] space-y-0.5 text-slate-800">
            <p className="font-extrabold text-xs text-[#183661] uppercase tracking-wide">
              {documento.nombreReceptor || documento.cliente?.razonSocial || "PUBLICO EN GENERAL"}
            </p>
            <p>
              <span className="font-bold text-[#183661]">USO CFDI: </span>
              {usoCfdiLabel}
            </p>
            <p>
              <span className="font-bold text-[#183661]">RFC: </span>
              <span className="font-mono font-semibold">
                {documento.rfcReceptor || documento.cliente?.rfc || "XAXX010101000"}
              </span>
            </p>
            <p>
              <span className="font-bold text-[#183661]">DOMICILIO FISCAL: </span>
              C.P. {documento.cpReceptor || documento.cliente?.codigoPostal || "54090"}, MEX
            </p>
            <p>
              <span className="font-bold text-[#183661]">RÉGIMEN FISCAL: </span>
              {regimenReceptorLabel}
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* 4. TABLE OF CONCEPTS (IDENTICAL TO STYLEKOREAN MX PDF)       */}
        {/* ------------------------------------------------------------ */}
        <div className="mt-6 mb-6">
          {/* Header Row Rounded Navy Pill */}
          <div className="bg-[#183661] text-white font-bold text-[11px] py-1.5 px-3 rounded-2xl flex items-center shadow-sm">
            <div className="w-[12%]">Unidad</div>
            <div className="w-[14%]">C. Prod/Serv</div>
            <div className="w-[12%] text-right pr-2">Cantidad</div>
            <div className="w-[16%] text-center">No. Ident.</div>
            <div className="w-[28%] pl-2">Descripción</div>
            <div className="w-[9%] text-right">P. Unitario</div>
            <div className="w-[9%] text-right">Importe</div>
          </div>

          {/* Items List */}
          <div className="divide-y divide-slate-100 text-[11px] pt-1">
            {documento.items
              .filter((it: any) => !it.excluido)
              .map((it: any) => {
                const cantFormatted = (it.cantidad || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                });
                const puFormatted = (it.precioUnitario || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const importeFormatted = (it.base || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                const ivaFormatted = (it.iva || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });

                return (
                  <div key={it.id} className="py-2.5 px-3 text-slate-800">
                    {/* Main Row */}
                    <div className="flex items-start">
                      <div className="w-[12%] text-slate-700">
                        {it.claveUnidad === "E48" || it.claveProdServ === "78101800"
                          ? "E48/Servicio"
                          : `${it.claveUnidad || "H87"}/Pieza`}
                      </div>
                      <div className="w-[14%] font-mono text-slate-700">
                        {it.claveProdServ || "53131613"}
                      </div>
                      <div className="w-[12%] text-right pr-2 font-mono">
                        {cantFormatted}
                      </div>
                      <div className="w-[16%] text-center font-mono text-[10px] text-slate-600 break-all px-1">
                        {it.barcode || it.sku || ""}
                      </div>
                      <div className="w-[28%] pl-2 font-medium text-slate-900 leading-tight">
                        {it.descripcion}
                      </div>
                      <div className="w-[9%] text-right font-mono">
                        $ {puFormatted}
                      </div>
                      <div className="w-[9%] text-right font-mono font-semibold">
                        $ {importeFormatted}
                      </div>
                    </div>

                    {/* Sub-row: Sí objeto de impuesto / IVA */}
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 pl-[38%]">
                      <span>Sí objeto de impuesto.</span>
                      <span className="font-mono text-slate-600 font-medium">
                        + IVA (16%): ${ivaFormatted}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* 5. TOTALS & AMOUNTS IN WORDS & PAYMENT TERMS                 */}
        {/* ------------------------------------------------------------ */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          {/* Subtotal, IVA, Total a la derecha */}
          <div className="flex justify-end mb-4">
            <div className="w-64 space-y-1 text-right text-xs">
              <div className="flex justify-between">
                <span className="font-extrabold text-[#183661]">SUBTOTAL:</span>
                <span className="font-mono font-bold">
                  $ {(documento.subtotal || 0).toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-extrabold text-[#183661]">+ IVA (16%):</span>
                <span className="font-mono font-bold">
                  $ {(documento.iva || 0).toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-slate-300">
                <span className="font-extrabold text-[#183661]">TOTAL:</span>
                <span className="font-mono font-extrabold text-slate-900">
                  $ {(documento.total || 0).toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Importe con Letra & Condiciones de Pago */}
          <div className="space-y-3 pt-2 text-[11px] text-slate-800">
            {/* Total con letra */}
            <div className="font-bold text-xs text-slate-900">
              {totalEnLetras}
            </div>

            {/* Condiciones de Pago alineadas a la derecha/centro como en PDF */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2 text-[11px]">
              <div>
                <p>
                  <span className="font-bold text-[#183661]">Fecha de Certificación: </span>
                  <span className="font-mono">{fechaTimbradoStr}</span>
                </p>
              </div>

              <div className="space-y-1 sm:text-right">
                <p>
                  <span className="font-bold text-[#183661]">Forma de Pago: </span>
                  {formaPagoLabel}
                </p>
                <p>
                  <span className="font-bold text-[#183661]">Método de Pago: </span>
                  {metodoPagoLabel}
                </p>
                <p>
                  <span className="font-bold text-[#183661]">Moneda: </span>
                  MXN
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* 6. FISCAL SECTION: CADENA ORIGINAL, SELLOS & QR DEL SAT     */}
        {/* ------------------------------------------------------------ */}
        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Sellos Digitales y Cadena Original (Col 9) */}
          <div className="md:col-span-9 space-y-3 text-[9px] text-slate-600">
            <div>
              <div className="font-bold text-[10px] text-[#183661] uppercase tracking-wide">
                CADENA ORIGINAL DEL COMPLEMENTO DE CERTIFICACION DIGITAL DEL SAT
              </div>
              <div className="font-mono break-all leading-tight text-[8.5px] text-slate-700 mt-0.5">
                {timbre?.cadenaOriginal ||
                  `||1.1|${timbre?.uuid || "UUID"}|${fechaTimbradoStr}|ICA050422AA6|...||00001000000718099104||`}
              </div>
            </div>

            <div>
              <div className="font-bold text-[10px] text-[#183661] uppercase tracking-wide">
                SELLO DIGITAL DEL CFDI
              </div>
              <div className="font-mono break-all leading-tight text-[8.5px] text-slate-700 mt-0.5">
                {timbre?.selloCfd || "SELLO_DIGITAL_CFDI"}
              </div>
            </div>

            <div>
              <div className="font-bold text-[10px] text-[#183661] uppercase tracking-wide">
                SELLO DIGITAL DEL SAT
              </div>
              <div className="font-mono break-all leading-tight text-[8.5px] text-slate-700 mt-0.5">
                {timbre?.selloSat || "SELLO_DIGITAL_SAT"}
              </div>
            </div>

            <div className="pt-1">
              <span className="font-bold text-[#183661]">
                No de Serie del Certificado del SAT:{" "}
              </span>
              <span className="font-mono text-slate-800">
                {timbre?.noCertificadoSat || "00001000000718099104"}
              </span>
            </div>
          </div>

          {/* QR Code SAT (Col 3) */}
          <div className="md:col-span-3 flex flex-col items-center justify-center pt-2">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Código QR Verificación SAT"
                className="w-36 h-36 object-contain border border-slate-200 rounded-lg p-1 bg-white shadow-sm"
              />
            ) : (
              <div className="w-36 h-36 border border-dashed rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                Generando QR SAT...
              </div>
            )}
            <span className="text-[8px] text-slate-400 font-mono mt-1">
              Verificación Oficial SAT
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* 7. FOOTER                                                    */}
        {/* ------------------------------------------------------------ */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500">
          <span>Este documento es una representación impresa de un CFDI - Versión: 4.0</span>
          <span>Hoja 1 de 1</span>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* CANCELLATION MODAL                                           */}
      {/* ------------------------------------------------------------ */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border">
            <div className="px-6 py-4 bg-red-600 text-white font-bold text-sm flex items-center justify-between">
              <span>Cancelar Comprobante Fiscal CFDI 4.0</span>
              <button onClick={() => setIsCancelModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCancelCfdi} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Selecciona el motivo de cancelación oficial conforme al estándar del SAT:
              </p>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Motivo de Cancelación (Catálogo SAT)
                </label>
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
