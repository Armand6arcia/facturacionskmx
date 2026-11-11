"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  ShoppingBag,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Receipt,
  FileCheck,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Settings,
  Plus,
  FileUp,
} from "lucide-react";

import { CompanyConfigModal } from "@/components/company-config-modal";
import { ClientsCatalogModal } from "@/components/clients-catalog-modal";
import { ProductsSatModal } from "@/components/products-sat-modal";

export default function DashboardPage() {
  const router = useRouter();

  // Modals state
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);

  // Dashboard Data State
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // File Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Error al cargar dashboard", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const processFile = async (uploadedFile: File) => {
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("tipoFactura", "CLIENTE");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Error al procesar el archivo");
      }

      router.push(`/revisar/${resJson.documentoId}`);
    } catch (err: any) {
      setUploadError(err.message || "Error al subir el archivo.");
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const loadSample = async (filename: string) => {
    setUploading(true);
    setUploadError(null);
    try {
      const res = await fetch(`/api/sample-file?name=${filename}`);
      if (!res.ok) throw new Error("No se pudo cargar el archivo demo.");
      const blob = await res.blob();
      const sampleFile = new File([blob], filename, { type: "application/vnd.ms-excel" });
      await processFile(sampleFile);
    } catch (e: any) {
      setUploadError(e.message || "Error al cargar demo");
      setUploading(false);
    }
  };

  const stats = data?.stats || {
    totalDocumentos: 0,
    totalTimbrados: 0,
    totalBorradores: 0,
    montoTotalTimbrado: 0,
    totalClientes: 0,
    totalProductos: 0,
    productosMapeados: 0,
    productosSinClave: 0,
  };

  const empresa = data?.empresa || {
    razonSocial: "STYLE KOREAN MEXICO S.A. DE C.V.",
    rfc: "SKM220101XYZ",
    regimenFiscal: "601",
    pacProvider: "mock",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* 1. Header / Empresa Saludo Bar */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md font-bold text-base shrink-0">
            SK
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Emisor CFDI 4.0
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sistema Activo
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {empresa.razonSocial}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
              <span>RFC: <b className="font-mono text-slate-700">{empresa.rfc}</b></span>
              <span>•</span>
              <span>Régimen: <b className="text-slate-700">{empresa.regimenFiscal} General de Ley</b></span>
              <span>•</span>
              <span className="text-blue-700 font-medium">PAC: {empresa.pacProvider === "mock" ? "Simulador Realista" : "Factura.com"}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCompanyModalOpen(true)}
          className="self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
        >
          <Settings className="h-3.5 w-3.5" />
          Configurar Empresa
        </button>
      </div>

      {/* 2. Top 4 Core Hub Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Mi Empresa */}
        <div
          onClick={() => setIsCompanyModalOpen(true)}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Listo
            </span>
          </div>
          <div className="mt-4">
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
              Mi Empresa
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Datos fiscales, lugar de expedición y PAC
            </p>
          </div>
        </div>

        {/* Clientes */}
        <div
          onClick={() => setIsClientsModalOpen(true)}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              {stats.totalClientes} registrados
            </span>
          </div>
          <div className="mt-4">
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-teal-600 transition-colors">
              Clientes
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Catálogo y alta con Constancia Fiscal PDF
            </p>
          </div>
        </div>

        {/* Productos y Servicios */}
        <div
          onClick={() => setIsProductsModalOpen(true)}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              {stats.totalProductos} SKUs
            </span>
          </div>
          <div className="mt-4">
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
              Productos y Servicios
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Mapeo de Claves SAT y catálogo de cosméticos
            </p>
          </div>
        </div>

        {/* Documentos */}
        <Link
          href="/historial"
          className="group relative bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-violet-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 group-hover:scale-105 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-violet-800 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
              {stats.totalDocumentos} procesados
            </span>
          </div>
          <div className="mt-4">
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-violet-600 transition-colors flex items-center justify-between">
              <span>Documentos</span>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Emisión, timbrados y bitácora de auditoría
            </p>
          </div>
        </Link>
      </div>

      {/* 3. Operación Principal: Cargar Orden (.xls) & Acceso Rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Emisión Rápida: Cargar Comprobante u Orden (.xls)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sube el archivo de orden interna (formato tabla HTML o Excel binario) para auditar partidas y timbrar.
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              Flujo en 2 pasos
            </span>
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Minimal Drag and Drop Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-50/60 scale-[0.99]"
                : "border-slate-300 hover:border-blue-400 bg-slate-50/40"
            }`}
          >
            <input
              type="file"
              id="fileInput"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processFile(e.target.files[0]);
                }
              }}
            />

            {uploading ? (
              <div className="py-4 space-y-2">
                <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="font-semibold text-slate-800 text-sm">
                  Leyendo y analizando archivo...
                </p>
                <p className="text-xs text-slate-400">
                  Detectando formato, partidas y claves SAT
                </p>
              </div>
            ) : (
              <label
                htmlFor="fileInput"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Haz clic para seleccionar o arrastra tu archivo .xls aquí
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Compatible con exportaciones de Style Korean (HTML_XLS y BINARY_XLS)
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors">
                  Examinar archivos
                </span>
              </label>
            )}
          </div>

          {/* Demos Quick Links */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs text-slate-500">
            <span>Archivos de prueba incluidos:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadSample("IN00491311.xls")}
                disabled={uploading}
                className="font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                Cargar IN00491311.xls (HTML)
              </button>
              <button
                type="button"
                onClick={() => loadSample("InvoiceIntg.xls")}
                disabled={uploading}
                className="font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                Cargar InvoiceIntg.xls (Binario)
              </button>
            </div>
          </div>
        </div>

        {/* Executive Summary Metrics Card (1 col) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Métricas del Sistema
              </h2>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block">Total Facturado Timbrado</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  ${stats.montoTotalTimbrado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-medium text-slate-500 ml-1">MXN</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[11px] text-emerald-700 font-medium block">Timbrados</span>
                  <span className="text-lg font-bold text-emerald-900 block mt-0.5">
                    {stats.totalTimbrados}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                  <span className="text-[11px] text-amber-700 font-medium block">Borradores</span>
                  <span className="text-lg font-bold text-amber-900 block mt-0.5">
                    {stats.totalBorradores}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Catálogo SAT Mapeado</span>
                  <span className="font-bold text-slate-800">
                    {stats.productosMapeados} / {stats.totalProductos}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${stats.totalProductos > 0 ? (stats.productosMapeados / stats.totalProductos) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/historial"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            <span>Ver Historial Detallado</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 4. Tabla de Últimos Comprobantes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Comprobantes Recientes</h3>
            <p className="text-xs text-slate-500">Órdenes procesadas recientemente en el sistema</p>
          </div>
          <Link
            href="/historial"
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
          >
            Ver todos ({stats.totalDocumentos})
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {data?.ultimosDocs && data.ultimosDocs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.ultimosDocs.map((doc: any) => (
              <div
                key={doc.id}
                className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm font-mono">
                      {doc.docNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        doc.estado === "TIMBRADO"
                          ? "bg-emerald-100 text-emerald-800"
                          : doc.estado === "CANCELADO"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {doc.estado}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {doc.tipoFactura}
                    </span>
                  </div>
                  <p className="text-slate-600 font-medium">{doc.clienteNombre}</p>
                </div>

                <div className="flex items-center gap-4 sm:text-right">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">
                      ${Number(doc.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} {doc.moneda || "MXN"}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {new Date(doc.fechaEmision).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <Link
                    href={doc.estado === "TIMBRADO" ? `/factura/${doc.id}` : `/revisar/${doc.id}`}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700 font-semibold transition-all shrink-0"
                  >
                    {doc.estado === "TIMBRADO" ? "Ver Factura" : "Continuar"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-slate-400">
            Aún no has procesado comprobantes. Sube una orden .xls arriba para comenzar.
          </div>
        )}
      </div>

      {/* Modals */}
      <CompanyConfigModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        empresaData={empresa}
        onSaved={() => fetchDashboardData()}
      />

      <ClientsCatalogModal
        isOpen={isClientsModalOpen}
        onClose={() => setIsClientsModalOpen(false)}
        onClientUpdated={() => fetchDashboardData()}
      />

      <ProductsSatModal
        isOpen={isProductsModalOpen}
        onClose={() => setIsProductsModalOpen(false)}
      />
    </div>
  );
}
