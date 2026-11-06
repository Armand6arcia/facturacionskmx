"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

export default function UploadPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (uploadedFile: File) => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("tipoFactura", "CLIENTE");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al procesar el archivo");
      }

      // Redirigir de inmediato al Paso 1 de revisión
      router.push(`/revisar/${data.documentoId}`);
    } catch (err: any) {
      setError(err.message || "Error al subir el archivo.");
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      processFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setFile(selected);
      processFile(selected);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Banner Principal */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 text-blue-100 text-xs font-semibold mb-3 border border-blue-400/30">
          <Sparkles className="h-3.5 w-3.5" />
          CFDI 4.0 MÉXICO • FLUJO EN 2 PASOS
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Carga y Lectura Automática de Comprobantes
        </h1>
        <p className="mt-2 text-blue-100 text-sm max-w-2xl leading-relaxed">
          Sube el archivo de comprobante interno (.xls HTML o Excel binario). En el <b>Paso 1</b> revisas y corriges partidas y catálogo SAT, y en el <b>Paso 2</b> seleccionas el cliente, tipo de factura y timbras el CFDI 4.0.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stepper Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shrink-0">
            1
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Paso 1: Revisión y Corrección</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Valida cantidades, precios WholeSale, observaciones y mapea productos nuevos al catálogo SAT.
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3 opacity-90">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-sm shrink-0">
            2
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Paso 2: Cliente y Facturación</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Busca o agrega el cliente, define forma y método de pago (transferencia por defecto) y genera el CFDI 4.0.
            </p>
          </div>
        </div>
      </div>

      {/* Zona Drag and Drop */}
      <div className="bg-white rounded-2xl p-8 border shadow-sm space-y-4">
        <div className="text-center max-w-md mx-auto">
          <h2 className="text-base font-bold text-slate-800">
            Arrastra tu archivo de exportación aquí
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Detecta automáticamente si es una tabla HTML exportada (.xls) o Excel binario real.
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
            isDragging
              ? "border-blue-500 bg-blue-50/60 scale-[1.01]"
              : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
          }`}
        >
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={loading}
          />
          <div className="flex flex-col items-center pointer-events-none">
            <div className="p-4 bg-white rounded-full shadow-sm text-blue-600 mb-3 border">
              <UploadCloud className="h-10 w-10" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {file ? file.name : "Haz clic para seleccionar o arrastra el archivo aquí"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Archivos .xls y .xlsx de órdenes de compra y exportaciones internas
            </p>
          </div>
        </div>

        {loading && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center gap-3 text-sm text-blue-800 font-semibold animate-pulse">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Leyendo archivo y calculando impuestos por partida...
          </div>
        )}
      </div>

      {/* Guía de reglas automáticas */}
      <div className="bg-slate-100 rounded-xl p-5 border text-xs text-slate-600 space-y-2">
        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Procesamiento automático que ahorra tiempo:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-slate-600">
          <div>• <b>Lectura por nombre de columna:</b> funciona sin importar el orden de las columnas.</div>
          <div>• <b>Limpieza de corchetes:</b> <code>[ 8809541379468 ]</code> se limpia a código de barras numérico.</div>
          <div>• <b>Precios a facturar:</b> toma <code>WholeSale Price</code> e ignora fila desalineada de Total.</div>
          <div>• <b>Cálculo exacto:</b> redondeo por línea SAT con tolerancia de $0.05 MXN.</div>
        </div>
      </div>
    </div>
  );
}
