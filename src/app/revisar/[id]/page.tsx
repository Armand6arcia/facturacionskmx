"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  BookmarkPlus,
  RefreshCw,
  Send,
  ArrowLeft,
  ArrowRight,
  FileText,
  Building2,
  Calendar,
  CreditCard,
  Scale,
  Sparkles,
  Users,
  Globe2,
  Truck,
  Search,
  Plus,
  FileUp,
  Trash2,
} from "lucide-react";
import { SkuResolverModal } from "@/components/sku-resolver-modal";
import { NewClientModal } from "@/components/new-client-modal";
import { isDeliveryFeeItem } from "@/lib/sat/catalog-defaults";

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const docId = params.id as string;

  // Step state: 1 = Revisión de partidas y SKUs, 2 = Cliente y Facturación
  const [paso, setPaso] = useState<1 | 2>(1);

  const [documento, setDocumento] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PAC Simulation switch
  const [simularFallaPAC, setSimularFallaPAC] = useState(false);
  const [facturando, setFacturando] = useState(false);
  const [pacError, setPacError] = useState<string | null>(null);

  // Sku resolver modal state
  const [isResolverOpen, setIsResolverOpen] = useState(false);
  const [unmappedSkus, setUnmappedSkus] = useState<any[]>([]);

  // Estado para subida de envío adicional y eliminación de borrador
  const [agregandoEnvio, setAgregandoEnvio] = useState(false);
  const [eliminandoBorrador, setEliminandoBorrador] = useState(false);

  const handleEliminarBorrador = async () => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar este borrador (${documento?.docNumber})? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setEliminandoBorrador(true);
    try {
      const res = await fetch(`/api/documentos/${docId}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error || "No se pudo eliminar el borrador.");
      } else {
        router.push("/historial");
      }
    } catch (e: any) {
      alert(e.message || "Error al eliminar el borrador.");
    } finally {
      setEliminandoBorrador(false);
    }
  };

  const handleSubirEnvioAdicional = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAgregandoEnvio(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/documentos/${docId}/agregar-envio`, {
        method: "POST",
        body: formData,
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error || "Error al agregar archivo de envío.");
      } else {
        await fetchDoc();
      }
    } catch (err: any) {
      alert(err.message || "Error al procesar el archivo de envío.");
    } finally {
      setAgregandoEnvio(false);
      e.target.value = "";
    }
  };

  // Paso 2: Invoice & Client Form State
  const [tipoFactura, setTipoFactura] = useState<
    "CLIENTE" | "GLOBAL_NACIONAL" | "GLOBAL_EXTRANJERO" | "TRASLADO"
  >("CLIENTE");
  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Payment defaults: DEFAULT 03 - Transferencia electrónica de fondos
  const [formaPago, setFormaPago] = useState("03");
  const [metodoPago, setMetodoPago] = useState("PUE");
  const [usoCfdi, setUsoCfdi] = useState("G01");
  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().slice(0, 10));
  const [serie, setSerie] = useState("F");
  const [numOrder, setNumOrder] = useState("");

  // Global invoice fields
  const [periodicidad, setPeriodicidad] = useState("04");
  const [mesGlobal, setMesGlobal] = useState("11");
  const [añoGlobal, setAñoGlobal] = useState("2026");
  const [accionGlobal, setAccionGlobal] = useState<"TIMBRAR_AHORA" | "GUARDAR_PERIODO">("TIMBRAR_AHORA");

  // Foreign invoice fields
  const [paisResidencia, setPaisResidencia] = useState("USA");
  const [numRegIdTrib, setNumRegIdTrib] = useState("");
  const [tipoExportacion, setTipoExportacion] = useState("01");
  const [ivaCero, setIvaCero] = useState(false);

  // Carta Porte fields
  const [plantillasCP, setPlantillasCP] = useState<any[]>([]);
  const [selectedPlantillaId, setSelectedPlantillaId] = useState("");
  const [origenCP, setOrigenCP] = useState("Av. Primero de Mayo 120, Naucalpan, Estado de México, C.P. 53500");
  const [destinoCP, setDestinoCP] = useState("Parque Industrial Belenes, Zapopan, Jalisco, C.P. 45150");
  const [distanciaKm, setDistanciaKm] = useState(535);
  const [vehiculoCP, setVehiculoCP] = useState("Camioneta Ford F-350 mod 2023");
  const [placasCP, setPlacasCP] = useState("LC-88-921");
  const [operadorCP, setOperadorCP] = useState("Roberto Sánchez Mendoza");
  const [rfcOperadorCP, setRfcOperadorCP] = useState("SAMR7906148K2");

  // Fetch document details
  const fetchDoc = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/documentos/${docId}`);
      if (!res.ok) throw new Error("Documento no encontrado");
      const data = await res.json();
      setDocumento(data.documento);
      setAlerts(data.alerts || []);

      // If document already had client or invoice settings:
      if (data.documento.docNumber) {
        setNumOrder(data.documento.docNumber);
      }
      if (data.documento.tipoFactura) {
        setTipoFactura(data.documento.tipoFactura);
      }
      if (data.documento.formaPago) {
        setFormaPago(data.documento.formaPago);
      }
      if (data.documento.usoCfdi) {
        setUsoCfdi(data.documento.usoCfdi);
      }
      if (data.documento.cliente) {
        setSelectedCliente(data.documento.cliente);
        setClientSearch(data.documento.cliente.razonSocial);
        if (!data.documento.usoCfdi && data.documento.cliente.usoCfdiDefault) {
          setUsoCfdi(data.documento.cliente.usoCfdiDefault);
        }
      }

      // Extract unmapped SKUs for the resolver modal (todos los productos toman 53131613 por default)
      const unmapped = data.documento.items
        .filter(
          (it: any) =>
            !it.excluido &&
            (!it.claveProdServ || it.claveProdServ.trim() === "") &&
            !isDeliveryFeeItem(it.sku, it.descripcion)
        )
        .map((it: any) => ({
          sku: it.sku,
          descripcion: it.descripcion,
          barcode: it.barcode,
          hsCode: it.hsCode,
        }));
      setUnmappedSkus(unmapped);
    } catch (err: any) {
      setError(err.message || "Error al cargar documento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (docId) {
      fetchDoc();
    }
    // Load clients catalog
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((data) => {
        if (data.clientes) {
          setClientes(data.clientes);
        }
      });

    // Load carta porte templates
    fetch("/api/plantillas-carta-porte")
      .then((r) => r.json())
      .then((data) => {
        if (data.plantillas && data.plantillas.length > 0) {
          setPlantillasCP(data.plantillas);
          applyPlantilla(data.plantillas[0]);
        }
      });
  }, [docId]);

  const applyPlantilla = (p: any) => {
    setSelectedPlantillaId(p.id);
    setOrigenCP(p.origen);
    setDestinoCP(p.destino);
    setDistanciaKm(p.distanciaKm);
    setVehiculoCP(p.vehiculo);
    setPlacasCP(p.placas);
    setOperadorCP(p.operador);
    setRfcOperadorCP(p.rfcOperador);
  };

  // Promo item treatment change
  const handlePromoTreatmentChange = async (itemId: string, treatment: "NORMAL" | "DESCUENTO_100" | "EXCLUIR") => {
    try {
      const updatePayload: any = { id: itemId };
      if (treatment === "EXCLUIR") {
        updatePayload.excluido = true;
        updatePayload.descuentoCien = false;
      } else if (treatment === "DESCUENTO_100") {
        updatePayload.excluido = false;
        updatePayload.descuentoCien = true;
      } else {
        updatePayload.excluido = false;
        updatePayload.descuentoCien = false;
      }

      const res = await fetch(`/api/documentos/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemUpdates: [updatePayload] }),
      });

      if (res.ok) fetchDoc();
    } catch (e) {
      console.error(e);
    }
  };

  // Inline price/qty change
  const handleItemChange = async (itemId: string, field: "cantidad" | "precioUnitario", value: number) => {
    try {
      const res = await fetch(`/api/documentos/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemUpdates: [{ id: itemId, [field]: value }],
        }),
      });

      if (res.ok) fetchDoc();
    } catch (e) {
      console.error(e);
    }
  };

  // Guardar configuración del Paso 2
  const savePaso2Config = async () => {
    const patchBody: any = {
      tipoFactura,
      formaPago,
      metodoPago,
      usoCfdi,
      serie,
      fechaEmision,
      docNumber: numOrder.trim() || undefined,
      clienteId: tipoFactura === "CLIENTE" && selectedCliente ? selectedCliente.id : null,
    };

    if (tipoFactura === "GLOBAL_NACIONAL") {
      patchBody.rfcReceptor = "XAXX010101000";
      patchBody.nombreReceptor = "PUBLICO EN GENERAL";
      patchBody.regimenReceptor = "616";
      patchBody.cpReceptor = "54090";
      patchBody.usoCfdi = "S01";
      patchBody.infoGlobal = { periodicidad, meses: mesGlobal, año: Number(añoGlobal) };
    } else if (tipoFactura === "GLOBAL_EXTRANJERO") {
      patchBody.rfcReceptor = "XEXX010101000";
      patchBody.nombreReceptor = "PUBLICO GENERAL EXTRANJERO";
      patchBody.regimenReceptor = "616";
      patchBody.cpReceptor = "54090";
      patchBody.usoCfdi = "S01";
      patchBody.datosExtranjero = { pais: paisResidencia, numRegIdTrib, tipoExportacion, ivaCero };
    } else if (tipoFactura === "TRASLADO") {
      patchBody.datosCartaPorte = {
        origen: origenCP,
        destino: destinoCP,
        distanciaKm,
        vehiculo: vehiculoCP,
        placas: placasCP,
        operador: operadorCP,
        rfcOperador: rfcOperadorCP,
        pesoBrutoTotal: documento.pesoTotalKg,
      };
    }

    const res = await fetch(`/api/documentos/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    });

    if (res.ok) {
      const d = await res.json();
      setDocumento(d.documento);
    }
  };

  // Facturar CFDI 4.0
  const handleFacturar = async () => {
    setFacturando(true);
    setPacError(null);

    try {
      // 1. Guardar primero la configuración del cliente y tipo de factura
      await savePaso2Config();

      // 2. Ejecutar timbrado con el PAC
      const res = await fetch("/api/timbrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentoId: docId,
          simularFalla: simularFallaPAC,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al procesar el timbrado con el PAC.");
      }

      // Redirigir a vista de factura timbrada
      router.push(`/factura/${docId}`);
    } catch (err: any) {
      setPacError(err.message || "Error al comunicarse con el PAC.");
    } finally {
      setFacturando(false);
    }
  };

  if (loading && !documento) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Cargando datos para revisión...</p>
      </div>
    );
  }

  if (error || !documento) {
    return (
      <div className="py-12 max-w-lg mx-auto text-center space-y-4">
        <div className="p-3 bg-red-100 text-red-700 inline-block rounded-full">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Error al cargar comprobante</h2>
        <p className="text-sm text-slate-600">{error || "No se encontró el documento solicitado."}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Carga
        </Link>
      </div>
    );
  }

  // Filtrar alertas para cada paso
  const unmappedSkuAlert = alerts.find((a) => a.id === "UNMAPPED_SKUS");
  const totalsMismatchAlert = alerts.find((a) => a.id === "TOTALS_MISMATCH");
  const itemAlerts = alerts.filter(
    (a) => a.id.startsWith("PROMO_") || a.id.startsWith("REF_") || a.id.startsWith("QTY_") || a.id === "MULTIPLE_PI_NO"
  );

  // Validación de Paso 2 para habilitar botón de Facturar
  const isPaso2Listo = () => {
    if (unmappedSkus.length > 0) return false;
    if (tipoFactura === "CLIENTE") {
      return Boolean(selectedCliente && selectedCliente.rfc && selectedCliente.razonSocial);
    }
    return true;
  };

  const filteredClientes = clientes.filter(
    (c) =>
      c.razonSocial.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.rfc.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Document Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Volver a Carga"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl text-slate-900 tracking-tight">
                Documento {documento.docNumber}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold uppercase">
                {documento.formatoOrigen}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  documento.estado === "TIMBRADO"
                    ? "bg-emerald-100 text-emerald-800"
                    : documento.estado === "CANCELADO"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {documento.estado}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Total partidas: <b className="text-slate-800">{documento.items.length}</b> • Piezas: <b className="text-slate-800">{documento.totalPiezas}</b> • Peso total: <b className="text-slate-800">{documento.pesoTotalKg} kg</b>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {documento.estado !== "TIMBRADO" && (
            <button
              type="button"
              disabled={eliminandoBorrador}
              onClick={handleEliminarBorrador}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-lg text-xs font-semibold border transition"
              title="Eliminar este borrador no concretado"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Descartar borrador</span>
            </button>
          )}

          {unmappedSkus.length > 0 && (
            <button
              onClick={() => setIsResolverOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition animate-bounce"
            >
              <BookmarkPlus className="h-4 w-4" />
              Resolver {unmappedSkus.length} producto(s) nuevo(s)
            </button>
          )}

          <button
            onClick={fetchDoc}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border transition"
            title="Recargar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* STEPPER DE NAVEGACIÓN EN 2 PASOS */}
      <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
        <button
          onClick={() => setPaso(1)}
          className={`flex items-center justify-center gap-3 p-3.5 rounded-xl border text-left transition ${
            paso === 1
              ? "bg-blue-50 border-blue-600 text-blue-900 shadow-sm"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
              paso === 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            1
          </div>
          <div>
            <div className="text-xs font-bold">Paso 1: Revisión y Corrección</div>
            <div className="text-[11px] text-slate-500">Partidas, precios y catálogo SAT</div>
          </div>
        </button>

        <button
          onClick={() => {
            if (unmappedSkus.length > 0) {
              setIsResolverOpen(true);
            } else {
              setPaso(2);
            }
          }}
          className={`flex items-center justify-center gap-3 p-3.5 rounded-xl border text-left transition ${
            paso === 2
              ? "bg-blue-50 border-blue-600 text-blue-900 shadow-sm"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
              paso === 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            2
          </div>
          <div>
            <div className="text-xs font-bold">Paso 2: Cliente y Facturación</div>
            <div className="text-[11px] text-slate-500">Receptor, pago y timbrado</div>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PASO 1: REVISIÓN DE PARTIDAS Y CATÁLOGO SAT */}
      {/* ========================================================================= */}
      {paso === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Tabla editable de partidas */}
          <div className="lg:col-span-8 bg-white rounded-2xl border shadow-sm overflow-hidden space-y-4">
            <div className="px-6 py-4 border-b bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Partidas del Comprobante ({documento.items.length} líneas)
                </h2>
                <p className="text-xs text-slate-500">
                  Cantidad a facturar = Invc Qty • Precio = WholeSale Price • Clave SAT por default: 53131613
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {documento.estado !== "TIMBRADO" && (
                  <>
                    <input
                      type="file"
                      id="envioAdicionalInput"
                      accept=".xls,.xlsx"
                      className="hidden"
                      onChange={handleSubirEnvioAdicional}
                    />
                    <button
                      type="button"
                      disabled={agregandoEnvio}
                      onClick={() => document.getElementById("envioAdicionalInput")?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 transition"
                      title="Agregar un archivo de envío (.xls) a esta factura"
                    >
                      {agregandoEnvio ? (
                        <>
                          <div className="h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          Agregando...
                        </>
                      ) : (
                        <>
                          <Truck className="h-3.5 w-3.5" />
                          + Agregar Envío (.xls)
                        </>
                      )}
                    </button>
                  </>
                )}
                <div className="text-xs text-slate-600 font-medium ml-1">
                  Subtotal: <b className="text-slate-900">${documento.subtotal.toFixed(2)}</b>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[640px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/80 text-slate-700 sticky top-0 z-10 border-b">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">SKU / Clave SAT</th>
                    <th className="py-2.5 px-3 font-semibold">Descripción</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Cant (Invc)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Precio Factura</th>
                    <th className="py-2.5 px-3 font-semibold text-right text-slate-400">Rate (Ref)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Base</th>
                    <th className="py-2.5 px-3 font-semibold text-right">IVA (16%)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Tratamiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {documento.items.map((it: any) => {
                    const hasSatCode = Boolean(it.claveProdServ);
                    const isPromo = it.purposeOfUse && /PROMO/i.test(it.purposeOfUse);
                    const hasRef = Boolean(it.reference && it.reference.trim() !== "");
                    const qtyDiff = it.piQty && it.piQty !== it.cantidad;

                    return (
                      <tr
                        key={it.id}
                        className={`hover:bg-slate-50 transition ${
                          it.excluido ? "opacity-40 bg-slate-100" : ""
                        }`}
                      >
                        {/* SKU & SAT status */}
                        <td className="py-2.5 px-3 align-top">
                          <div className="font-mono font-bold text-slate-800">{it.sku}</div>
                          {isDeliveryFeeItem(it.sku, it.descripcion, it.claveProdServ, it.claveUnidad) ? (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 mt-1">
                              <Truck className="h-3 w-3 shrink-0" />
                              78101800 (E48 Servicio)
                            </div>
                          ) : (
                            <div className="text-[11px] font-mono text-emerald-700 flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                              {it.claveProdServ || "53131613"} (H87 Pieza)
                            </div>
                          )}
                          {it.barcode && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {it.barcode}
                            </div>
                          )}
                        </td>

                        {/* Descripción & Avisos */}
                        <td className="py-2.5 px-3 align-top max-w-[220px]">
                          <div className="font-medium text-slate-800 line-clamp-2">{it.descripcion}</div>
                          {it.brand && <div className="text-[10px] text-slate-400">{it.brand}</div>}

                          {hasRef && (
                            <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              Ref: {it.reference}
                            </div>
                          )}
                          {qtyDiff && (
                            <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                              PI: {it.piQty} vs Invc: {it.cantidad}
                            </div>
                          )}
                        </td>

                        {/* Cantidad editable */}
                        <td className="py-2.5 px-3 align-top text-right font-medium">
                          <input
                            type="number"
                            disabled={it.excluido}
                            defaultValue={it.cantidad}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val !== it.cantidad) {
                                handleItemChange(it.id, "cantidad", val);
                              }
                            }}
                            className="w-16 px-1.5 py-1 border rounded text-right font-mono text-xs focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Precio WholeSale editable */}
                        <td className="py-2.5 px-3 align-top text-right font-medium">
                          <input
                            type="number"
                            step="0.01"
                            disabled={it.excluido}
                            defaultValue={it.precioUnitario}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val !== it.precioUnitario) {
                                handleItemChange(it.id, "precioUnitario", val);
                              }
                            }}
                            className="w-20 px-1.5 py-1 border rounded text-right font-mono text-xs focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Rate informativo en gris */}
                        <td className="py-2.5 px-3 align-top text-right font-mono text-slate-400">
                          {it.rateReferencia ? `$${it.rateReferencia.toFixed(2)}` : "-"}
                        </td>

                        {/* Base Subtotal */}
                        <td className="py-2.5 px-3 align-top text-right font-mono font-semibold text-slate-800">
                          ${it.base.toFixed(2)}
                        </td>

                        {/* IVA */}
                        <td className="py-2.5 px-3 align-top text-right font-mono text-slate-700">
                          ${it.iva.toFixed(2)}
                        </td>

                        {/* Tratamiento Promo */}
                        <td className="py-2.5 px-3 align-top text-center">
                          {isPromo || it.precioUnitario === 0 ? (
                            <select
                              value={
                                it.excluido
                                  ? "EXCLUIR"
                                  : it.descuentoCien
                                  ? "DESCUENTO_100"
                                  : "NORMAL"
                              }
                              onChange={(e) =>
                                handlePromoTreatmentChange(it.id, e.target.value as any)
                              }
                              className="px-1.5 py-1 text-[11px] border rounded bg-amber-50 text-amber-900 border-amber-300 font-semibold"
                            >
                              <option value="NORMAL">Normal</option>
                              <option value="DESCUENTO_100">100% Descto</option>
                              <option value="EXCLUIR">Excluir</option>
                            </select>
                          ) : (
                            <span className="text-[11px] text-slate-400">Normal</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Columna Derecha: Resumen de Totales y Avance al Paso 2 */}
          <div className="lg:col-span-4 space-y-5">
            {/* Totales Card */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Cálculo de Impuestos SAT
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Moneda MXN
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (suma de bases):</span>
                  <span className="font-mono font-semibold text-slate-900">
                    ${documento.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>IVA Trasladado (16% por línea):</span>
                  <span className="font-mono font-semibold text-slate-900">
                    ${documento.iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-2 border-t flex justify-between text-sm font-extrabold text-blue-900">
                  <span>TOTAL ESTIMADO:</span>
                  <span className="font-mono text-base">
                    ${documento.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                  </span>
                </div>
              </div>

              {/* Tolerancia fiscal validada */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Totales validados:</span> Cuadra exactamente con el desglose por partida conforme a la tolerancia fiscal de $0.05 MXN.
                </div>
              </div>
            </div>

            {/* Alertas de Partidas / SKUs */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-blue-600" />
                  Alertas de Partidas
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  {unmappedSkus.length > 0 ? `${unmappedSkus.length} pendientes` : "Completas"}
                </span>
              </div>

              {/* Si hay SKUs sin mapear */}
              {unmappedSkus.length > 0 ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-red-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{unmappedSkus.length} producto(s) sin clave SAT</span>
                  </div>
                  <p className="text-red-700 leading-relaxed">
                    Los productos nuevos requieren clave SAT para facturar. Puedes sugerir y guardar la clave en 15 segundos.
                  </p>
                  <button
                    onClick={() => setIsResolverOpen(true)}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition shadow-sm text-center flex items-center justify-center gap-2"
                  >
                    <BookmarkPlus className="h-4 w-4" />
                    Resolver {unmappedSkus.length} productos ahora
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Todos los SKUs cuentan con clave SAT asignada.</span>
                </div>
              )}

              {/* Notas amarillas */}
              {itemAlerts.length > 0 && (
                <div className="space-y-2 pt-1">
                  {itemAlerts.map((ia) => (
                    <div
                      key={ia.id}
                      className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-1.5"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <b>{ia.titulo}:</b> {ia.mensaje}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTÓN DE AVANCE AL PASO 2 */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md space-y-3">
              <div className="text-xs text-slate-300">
                Una vez revisadas las cantidades, precios y claves SAT de las partidas:
              </div>

              <button
                type="button"
                onClick={() => {
                  if (unmappedSkus.length > 0) {
                    setIsResolverOpen(true);
                  } else {
                    setPaso(2);
                  }
                }}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 ${
                  unmappedSkus.length === 0
                    ? "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                    : "bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
                }`}
              >
                {unmappedSkus.length === 0 ? (
                  <>
                    Continuar al Paso 2: Datos de Facturación
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-4 w-4" />
                    Resolver {unmappedSkus.length} productos para continuar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 2: CLIENTE, CONDICIONES DE PAGO Y FACTURACIÓN */}
      {/* ========================================================================= */}
      {paso === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Formulario de Facturación y Cliente */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 sm:p-8 border shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Paso 2: Datos del Receptor y Facturación
                </h2>
                <p className="text-xs text-slate-500">
                  Selecciona el cliente, el número de pedido y confirma las condiciones de pago.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-semibold px-3 py-1.5 rounded-lg border hover:bg-blue-50 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Modificar partidas (Paso 1)
              </button>
            </div>

            {/* Campo Orden / Pedido (IN0049XXXX) editable */}
            <div className="p-4 bg-gradient-to-r from-blue-50/90 via-white to-blue-50/40 border-2 border-blue-200 rounded-xl space-y-2 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Número de Orden / Pedido (Factura.com & PDF)
                </label>
                <span className="text-[11px] font-semibold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                  Aparece en columna Orden de Factura.com y en el PDF
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={numOrder}
                  onChange={(e) => setNumOrder(e.target.value.toUpperCase())}
                  placeholder="ej. IN00493041"
                  className="w-full px-3.5 py-2.5 border-2 border-blue-300 rounded-lg bg-white font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-600 uppercase transition placeholder:font-normal placeholder:text-slate-400 placeholder:normal-case shadow-xs"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Si el archivo original no contenía el número de orden o deseas corregirlo, ingrésalo aquí (ej. <b className="font-mono text-slate-700">IN00493041</b>). Se sincronizará en la columna <b className="font-mono text-slate-700">Orden</b> de Factura.com y en el renglón <b className="text-slate-700">Orden/Pedido:</b> del PDF oficial.
              </p>
            </div>

            {/* Selector de Tipo de Factura */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Seleccionar Tipo de Factura
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "CLIENTE", label: "Cliente específico", icon: Building2 },
                  { id: "GLOBAL_NACIONAL", label: "Público general", icon: Users },
                  { id: "GLOBAL_EXTRANJERO", label: "Extranjero", icon: Globe2 },
                  { id: "TRASLADO", label: "Carta Porte", icon: Truck },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSel = tipoFactura === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipoFactura(t.id as any)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                        isSel
                          ? "border-blue-600 bg-blue-50/70 text-blue-900 font-semibold shadow-sm"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <Icon className={`h-5 w-5 mb-1.5 ${isSel ? "text-blue-600" : "text-slate-400"}`} />
                      <span className="text-xs">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contenido dinámico del receptor */}
            <div className="p-5 rounded-xl border bg-slate-50/70 space-y-4">
              {/* 1. CLIENTE ESPECIFICO */}
              {tipoFactura === "CLIENTE" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Buscar Cliente a Facturar (RFC o Razón Social)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="flex items-center gap-1 text-xs text-blue-700 font-bold hover:underline"
                        title="Subir PDF de Constancia de Situación Fiscal del SAT"
                      >
                        <FileUp className="h-3.5 w-3.5" />
                        Subir Constancia Fiscal (PDF)
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="flex items-center gap-1 text-xs text-slate-600 font-medium hover:text-slate-900"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Manual
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setSelectedCliente(null);
                      }}
                      placeholder="Escribe el nombre o RFC (ej. Kocare Beauty, Farmacias...)"
                      className="w-full pl-9 pr-3 py-2 border rounded-lg text-xs sm:text-sm bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Dropdown de coincidencias */}
                  {!selectedCliente && clientSearch.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border rounded-lg bg-white divide-y shadow-sm">
                      {filteredClientes.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center">
                          No se encontraron clientes. Puedes crearlo con el botón "+ Agregar nuevo cliente".
                        </div>
                      ) : (
                        filteredClientes.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCliente(c);
                              setClientSearch(c.razonSocial);
                              if (c.usoCfdiDefault) setUsoCfdi(c.usoCfdiDefault);
                            }}
                            className="w-full p-2.5 text-left text-xs hover:bg-blue-50 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-slate-800">{c.razonSocial}</span>
                              <span className="text-slate-500 ml-2 font-mono">({c.rfc})</span>
                            </div>
                            <span className="text-slate-400">C.P. {c.codigoPostal}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tarjeta de Cliente Seleccionado */}
                  {selectedCliente ? (
                    <div className="p-4 bg-white border border-blue-200 rounded-xl text-xs space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-blue-900">{selectedCliente.razonSocial}</span>
                        <span className="font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                          {selectedCliente.rfc}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 pt-2 border-t">
                        <div><b>Código Postal Fiscal:</b> {selectedCliente.codigoPostal}</div>
                        <div><b>Régimen Fiscal:</b> {selectedCliente.regimenFiscal}</div>
                      </div>
                      <div className="pt-2 border-t">
                        <label className="block font-bold text-slate-700 mb-1">
                          Uso de CFDI para esta factura:
                        </label>
                        <select
                          value={usoCfdi}
                          onChange={(e) => setUsoCfdi(e.target.value)}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-blue-50/40 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="G01">G01 - Adquisición de mercancías</option>
                          <option value="G03">G03 - Gastos en general</option>
                          <option value="G02">G02 - Devoluciones, descuentos o bonificaciones</option>
                          <option value="I01">I01 - Construcciones</option>
                          <option value="I02">I02 - Mobiliario y equipo de oficina por inversiones</option>
                          <option value="I03">I03 - Equipo de transporte</option>
                          <option value="I04">I04 - Equipo de cómputo y accesorios</option>
                          <option value="I08">I08 - Otra maquinaria y equipo</option>
                          <option value="D01">D01 - Honorarios médicos, dentales y gastos hospitalarios</option>
                          <option value="D04">D04 - Donativos</option>
                          <option value="S01">S01 - Sin efectos fiscales</option>
                          <option value="CP01">CP01 - Pagos</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>Por favor busca y selecciona un cliente en el catálogo para poder emitir la factura.</span>
                    </div>
                  )}
                </div>
              )}

              {/* 2. PUBLICO GENERAL NACIONAL */}
              {tipoFactura === "GLOBAL_NACIONAL" && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1 text-blue-900">
                    <div className="font-bold">Datos para Factura Global Nacional:</div>
                    <div>RFC: <span className="font-mono font-semibold">XAXX010101000</span> | Razón Social: PUBLICO EN GENERAL</div>
                    <div>Régimen: 616 (Sin obligaciones fiscales) | Uso CFDI: S01 (Sin efectos fiscales)</div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Periodicidad</label>
                      <select
                        value={periodicidad}
                        onChange={(e) => setPeriodicidad(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                      >
                        <option value="01">01 - Diario</option>
                        <option value="02">02 - Semanal</option>
                        <option value="03">03 - Catorcenal</option>
                        <option value="04">04 - Mensual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Mes</label>
                      <select
                        value={mesGlobal}
                        onChange={(e) => setMesGlobal(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                      >
                        <option value="11">11 - Noviembre</option>
                        <option value="12">12 - Diciembre</option>
                        <option value="10">10 - Octubre</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Año</label>
                      <input
                        type="number"
                        value={añoGlobal}
                        onChange={(e) => setAñoGlobal(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. PUBLICO GENERAL EXTRANJERO */}
              {tipoFactura === "GLOBAL_EXTRANJERO" && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Aviso fiscal para cliente extranjero
                    </div>
                    <div>
                      RFC genérico: <span className="font-mono font-semibold">XEXX010101000</span>. Puede requerir complemento de comercio exterior si aplica exportación definitiva.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">País de residencia fiscal</label>
                      <select
                        value={paisResidencia}
                        onChange={(e) => setPaisResidencia(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                      >
                        <option value="USA">USA - Estados Unidos</option>
                        <option value="CAN">CAN - Canadá</option>
                        <option value="KOR">KOR - Corea del Sur</option>
                        <option value="COL">COL - Colombia</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tax ID / No. Registro Tributario (opcional)
                      </label>
                      <input
                        type="text"
                        value={numRegIdTrib}
                        onChange={(e) => setNumRegIdTrib(e.target.value)}
                        placeholder="ej. US123456789"
                        className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. CARTA PORTE */}
              {tipoFactura === "TRASLADO" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Plantilla de Transporte / Ruta
                    </span>
                    <span className="text-xs text-blue-700 font-medium">CFDI de Traslado 4.0</span>
                  </div>

                  {plantillasCP.length > 0 && (
                    <select
                      value={selectedPlantillaId}
                      onChange={(e) => {
                        const p = plantillasCP.find((pl) => pl.id === e.target.value);
                        if (p) applyPlantilla(p);
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-white font-semibold"
                    >
                      {plantillasCP.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.distanciaKm} km)
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700">Origen</label>
                      <input
                        type="text"
                        value={origenCP}
                        onChange={(e) => setOrigenCP(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 border rounded bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700">Destino</label>
                      <input
                        type="text"
                        value={destinoCP}
                        onChange={(e) => setDestinoCP(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 border rounded bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700">Vehículo</label>
                      <input
                        type="text"
                        value={vehiculoCP}
                        onChange={(e) => setVehiculoCP(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 border rounded bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700">Placas</label>
                      <input
                        type="text"
                        value={placasCP}
                        onChange={(e) => setPlacasCP(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 border rounded bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700">Operador</label>
                      <input
                        type="text"
                        value={operadorCP}
                        onChange={(e) => setOperadorCP(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 border rounded bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Condiciones de Pago: POR DEFAULT 03 TRANSFERENCIA */}
            <div className="pt-2 border-t space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-blue-600" />
                Uso de CFDI, Condiciones de Pago y Emisión
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Uso de CFDI (Catálogo SAT)
                  </label>
                  <select
                    value={usoCfdi}
                    onChange={(e) => setUsoCfdi(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="G01">G01 - Adquisición de mercancías</option>
                    <option value="G03">G03 - Gastos en general</option>
                    <option value="G02">G02 - Devoluciones, descuentos o bonificaciones</option>
                    <option value="I01">I01 - Construcciones</option>
                    <option value="I02">I02 - Mobiliario y equipo de oficina por inversiones</option>
                    <option value="I03">I03 - Equipo de transporte</option>
                    <option value="I04">I04 - Equipo de cómputo y accesorios</option>
                    <option value="I08">I08 - Otra maquinaria y equipo</option>
                    <option value="D01">D01 - Honorarios médicos, dentales y gastos hospitalarios</option>
                    <option value="D04">D04 - Donativos</option>
                    <option value="S01">S01 - Sin efectos fiscales</option>
                    <option value="CP01">CP01 - Pagos</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Forma de Pago (Por default: Transferencia)
                  </label>
                  <select
                    value={formaPago}
                    onChange={(e) => setFormaPago(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="03">03 - Transferencia electrónica de fondos</option>
                    <option value="01">01 - Efectivo</option>
                    <option value="04">04 - Tarjeta de crédito</option>
                    <option value="28">28 - Tarjeta de débito</option>
                    <option value="99">99 - Por definir</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Método de Pago</label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PUE">PUE - Pago en una sola exhibición</option>
                    <option value="PPD">PPD - Pago en parcialidades o diferido</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha de Emisión</label>
                  <input
                    type="date"
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white font-medium text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Resumen Fiscal y Botón Final "Facturar" */}
          <div className="lg:col-span-4 space-y-5">
            {/* Tarjeta de Resumen */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Resumen de Facturación
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  CFDI 4.0
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase">Receptor Fiscal:</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {tipoFactura === "CLIENTE"
                      ? selectedCliente?.razonSocial || "⚠️ Pendiente de seleccionar"
                      : tipoFactura === "GLOBAL_NACIONAL"
                      ? "PUBLICO EN GENERAL"
                      : tipoFactura === "GLOBAL_EXTRANJERO"
                      ? "PUBLICO GENERAL EXTRANJERO"
                      : "CFDI DE TRASLADO"}
                  </span>
                  {selectedCliente && (
                    <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                      RFC: {selectedCliente.rfc} • C.P. {selectedCliente.codigoPostal} • Uso: <b>{usoCfdi}</b>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t flex justify-between items-center text-slate-600">
                  <span className="text-[11px] uppercase text-slate-400">Orden / Pedido:</span>
                  <span className="font-mono font-bold text-xs text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {numOrder || "Sin asignar"}
                  </span>
                </div>

                <div className="pt-2 border-t flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    ${documento.subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>IVA Trasladado (16%):</span>
                  <span className="font-mono font-semibold text-slate-900">
                    ${documento.iva.toFixed(2)}
                  </span>
                </div>

                <div className="pt-2 border-t flex justify-between text-sm font-extrabold text-blue-900">
                  <span>TOTAL A FACTURAR:</span>
                  <span className="font-mono text-base">
                    ${documento.total.toFixed(2)} MXN
                  </span>
                </div>
              </div>
            </div>

            {/* Controles de PAC y Botón de FACTURAR */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-5">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2 text-white">
                  <Send className="h-4 w-4 text-blue-400" />
                  Timbrado Fiscal Digital CFDI 4.0
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Emisión oficial conectada con Factura.com y validación fiscal del SAT.
                </p>
              </div>

              {pacError && (
                <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-300">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                    Respuesta del PAC:
                  </div>
                  <p>{pacError}</p>
                </div>
              )}

              {/* BOTÓN PROMINENTE DE FACTURAR */}
              <button
                type="button"
                disabled={!isPaso2Listo() || facturando}
                onClick={handleFacturar}
                className={`w-full py-4 px-4 rounded-xl font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 ${
                  isPaso2Listo() && !facturando
                    ? "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                }`}
              >
                {facturando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Timbrando CFDI 4.0...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    {documento.estado === "TIMBRADO" ? "Ver CFDI Timbrado" : "Facturar CFDI 4.0"}
                  </>
                )}
              </button>

              {!isPaso2Listo() && (
                <p className="text-[11px] text-center text-amber-400 font-medium">
                  {tipoFactura === "CLIENTE" && !selectedCliente
                    ? "⚠️ Selecciona un cliente en el buscador para habilitar el botón de Facturar."
                    : "⚠️ Resuelve las partidas pendientes en el Paso 1 para facturar."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sku Resolver Modal */}
      <SkuResolverModal
        isOpen={isResolverOpen}
        onClose={() => setIsResolverOpen(false)}
        unmappedSkus={unmappedSkus}
        onResolved={() => {
          fetchDoc();
        }}
      />

      {/* New Client Modal */}
      <NewClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onClientCreated={(nc) => {
          setClientes((prev) => [nc, ...prev]);
          setSelectedCliente(nc);
          setClientSearch(nc.razonSocial);
          if (nc.usoCfdiDefault) setUsoCfdi(nc.usoCfdiDefault);
        }}
      />
    </div>
  );
}
