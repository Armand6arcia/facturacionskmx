"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Building2,
  Check,
  AlertCircle,
  FileUp,
  FileText,
  Loader2,
  Sparkles,
  Edit2,
} from "lucide-react";

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (client: any) => void;
  clientToEdit?: any | null;
  onClientUpdated?: (client: any) => void;
}

export function NewClientModal({
  isOpen,
  onClose,
  onClientCreated,
  clientToEdit,
  onClientUpdated,
}: NewClientModalProps) {
  const [rfc, setRfc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [regimenFiscal, setRegimenFiscal] = useState("601");
  const [usoCfdi, setUsoCfdi] = useState("G03");
  const [loading, setLoading] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (clientToEdit) {
      setRfc(clientToEdit.rfc || "");
      setRazonSocial(clientToEdit.razonSocial || "");
      setCodigoPostal(clientToEdit.codigoPostal || "");
      setRegimenFiscal(clientToEdit.regimenFiscal || "601");
      setUsoCfdi(clientToEdit.usoCfdiDefault || "G03");
      setPdfSuccess(null);
      setError(null);
    } else {
      setRfc("");
      setRazonSocial("");
      setCodigoPostal("");
      setRegimenFiscal("601");
      setUsoCfdi("G03");
      setPdfSuccess(null);
      setError(null);
    }
  }, [isOpen, clientToEdit]);

  if (!isOpen) return null;

  const handleCsfUpload = async (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setError("El archivo debe ser un documento PDF del SAT.");
      return;
    }

    setParsingPdf(true);
    setError(null);
    setPdfSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/clientes/parse-csf", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo leer la constancia fiscal");
      }

      const { data } = json;
      if (data) {
        if (data.rfc) setRfc(data.rfc);
        if (data.razonSocial) setRazonSocial(data.razonSocial);
        if (data.codigoPostal) setCodigoPostal(data.codigoPostal);
        if (data.regimenFiscal) setRegimenFiscal(data.regimenFiscal);
        if (data.usoCfdiSugerido) setUsoCfdi(data.usoCfdiSugerido);

        setPdfSuccess(
          `Constancia procesada: ${data.rfc} (${data.tipoPersona === "MORAL" ? "Persona Moral" : "Persona Física"}). Revisa y confirma los datos.`
        );
      }
    } catch (err: any) {
      setError(err.message || "Error al leer el archivo PDF.");
    } finally {
      setParsingPdf(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleCsfUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (clientToEdit) {
        // Modo Edición: PUT /api/clientes
        const res = await fetch("/api/clientes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: clientToEdit.id,
            rfc: rfc.trim().toUpperCase(),
            razonSocial: razonSocial.trim().toUpperCase(),
            codigoPostal: codigoPostal.trim(),
            regimenFiscal,
            usoCfdiDefault: usoCfdi,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Error al actualizar cliente");
        }

        if (onClientUpdated) onClientUpdated(data.cliente);
        onClose();
      } else {
        // Modo Creación: POST /api/clientes
        const res = await fetch("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rfc: rfc.trim().toUpperCase(),
            razonSocial: razonSocial.trim().toUpperCase(),
            codigoPostal: codigoPostal.trim(),
            regimenFiscal,
            usoCfdiDefault: usoCfdi,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Error al registrar cliente");
        }

        onClientCreated(data.cliente);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Error al procesar cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800">
              {clientToEdit ? "Editar Cliente Fiscal (CFDI 4.0)" : "Alta de Cliente Fiscal (CFDI 4.0)"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Constancia de Situacion Fiscal Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
              parsingPdf
                ? "border-blue-400 bg-blue-50/50"
                : pdfSuccess
                ? "border-emerald-400 bg-emerald-50/40"
                : "border-slate-300 hover:border-blue-400 bg-slate-50/60"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleCsfUpload(e.target.files[0]);
                }
              }}
            />

            {parsingPdf ? (
              <div className="flex flex-col items-center justify-center py-2 gap-2 text-blue-700">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm font-semibold">
                  Extrayendo datos fiscales del PDF...
                </span>
                <span className="text-xs text-slate-500">
                  Limpiando razón social según normatividad CFDI 4.0 del SAT
                </span>
              </div>
            ) : pdfSuccess ? (
              <div className="flex items-center justify-between gap-3 text-left">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">{pdfSuccess}</p>
                    <p className="text-[11px] text-emerald-700">
                      Razón social, RFC, Código Postal y Régimen Fiscal autocompletados.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline whitespace-nowrap"
                >
                  Subir otro PDF
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer flex flex-col items-center justify-center py-2 gap-1.5"
              >
                <div className="p-2 rounded-full bg-blue-100 text-blue-600 mb-1">
                  <FileUp className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-bold text-slate-800">
                    Cargar Constancia de Situación Fiscal (PDF)
                  </span>
                </div>
                <p className="text-xs text-slate-500 max-w-sm">
                  Arrastra aquí el archivo oficial del SAT o haz clic para autollenar todos los campos sin errores de captura.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Manual / Verified Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                RFC (12 o 13 caracteres) *
              </label>
              <input
                type="text"
                required
                maxLength={13}
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                placeholder="EKU9003173C9"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-mono uppercase bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Razón Social o Nombre Completo *
                </label>
                <span className="text-[11px] text-slate-500">
                  (Sin régimen societario como S.A. de C.V.)
                </span>
              </div>
              <input
                type="text"
                required
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value.toUpperCase())}
                placeholder="KOCARE BEAUTY"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 uppercase bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Código Postal Fiscal *
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={codigoPostal}
                  onChange={(e) => setCodigoPostal(e.target.value)}
                  placeholder="06600"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Régimen Fiscal *
                </label>
                <select
                  value={regimenFiscal}
                  onChange={(e) => setRegimenFiscal(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="601">601 - General de Ley Personas Morales</option>
                  <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                  <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                  <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                  <option value="605">605 - Sueldos y Salarios</option>
                  <option value="606">606 - Arrendamiento</option>
                  <option value="616">616 - Sin obligaciones fiscales</option>
                  <option value="621">621 - Incorporación Fiscal</option>
                  <option value="625">625 - Plataformas Tecnológicas</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Uso de CFDI por Defecto
              </label>
              <select
                value={usoCfdi}
                onChange={(e) => setUsoCfdi(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="G03">G03 - Gastos en general</option>
                <option value="G01">G01 - Adquisición de mercancías</option>
                <option value="S01">S01 - Sin efectos fiscales</option>
                <option value="CP01">CP01 - Pagos</option>
              </select>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || parsingPdf}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  "Guardando..."
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {clientToEdit ? "Actualizar Cliente" : "Guardar Cliente"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
