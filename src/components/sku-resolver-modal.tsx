"use client";

import { useState } from "react";
import { Sparkles, Check, X, AlertCircle, BookmarkCheck } from "lucide-react";

interface UnmappedSkuItem {
  sku: string;
  descripcion: string;
  barcode?: string;
  hsCode?: string;
}

interface SkuResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  unmappedSkus: UnmappedSkuItem[];
  onResolved: () => void;
}

const DEMO_CATALOG_SUGGESTIONS = [
  { clave: "53131602", descripcion: "Lociones o humectantes para el cuidado de la piel" },
  { clave: "53131613", descripcion: "Limpiadores faciales y desmaquillantes" },
  { clave: "53131628", descripcion: "Mascarillas faciales y tratamientos" },
  { clave: "53131631", descripcion: "Protectores solares o bloqueadores" },
  { clave: "53131600", descripcion: "Cosméticos y productos de cuidado personal" },
];

export function SkuResolverModal({
  isOpen,
  onClose,
  unmappedSkus,
  onResolved,
}: SkuResolverModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [claveInput, setClaveInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [unidadInput, setUnidadInput] = useState("H87"); // Pieza
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || unmappedSkus.length === 0) return null;

  const currentItem = unmappedSkus[currentIdx] || unmappedSkus[0];

  const handleSuggest = () => {
    // Pick recommendation based on item description
    const desc = currentItem.descripcion.toLowerCase();
    let match = DEMO_CATALOG_SUGGESTIONS[0];
    if (desc.includes("mask") || desc.includes("mascarilla")) {
      match = DEMO_CATALOG_SUGGESTIONS[2];
    } else if (desc.includes("clean") || desc.includes("oil") || desc.includes("limpiador")) {
      match = DEMO_CATALOG_SUGGESTIONS[1];
    } else if (desc.includes("sun") || desc.includes("solar")) {
      match = DEMO_CATALOG_SUGGESTIONS[3];
    }
    setClaveInput(match.clave);
    setDescInput(`${match.descripcion} (demo, validar con catálogo SAT)`);
  };

  const handleSaveAndConfirm = async () => {
    if (!claveInput) {
      setError("Por favor ingresa o sugiere una clave SAT.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/productos-sat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: currentItem.sku,
          claveProdServ: claveInput,
          claveUnidad: unidadInput,
          descripcion: currentItem.descripcion,
          barcode: currentItem.barcode,
          hsCode: currentItem.hsCode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar clave SAT");
      }

      // If more unmapped items, move to next
      if (currentIdx < unmappedSkus.length - 1) {
        setCurrentIdx((prev) => prev + 1);
        setClaveInput("");
        setDescInput("");
      } else {
        // All resolved!
        onResolved();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Error al resolver SKU");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                Mapeo de Producto Nuevo al Catálogo SAT
              </h3>
              <p className="text-xs text-blue-200">
                Producto {currentIdx + 1} de {unmappedSkus.length} sin mapear
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Item Card */}
          <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded">
                SKU: {currentItem.sku}
              </span>
              {currentItem.barcode && (
                <span className="text-xs text-slate-500 font-mono">
                  Barcode: {currentItem.barcode}
                </span>
              )}
            </div>
            <p className="font-semibold text-slate-800 text-sm">{currentItem.descripcion}</p>
            {currentItem.hsCode && (
              <p className="text-xs text-slate-500">
                Fracción arancelaria (HS CODE): <span className="font-mono">{currentItem.hsCode}</span>{" "}
                <span className="italic text-slate-400">(Informativa, no es la clave SAT)</span>
              </p>
            )}
          </div>

          {/* Clave SAT input & Suggest button */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-xs">
                Clave de Producto/Servicio SAT (8 dígitos)
              </label>
              <button
                type="button"
                onClick={handleSuggest}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-100 text-amber-900 text-xs font-bold hover:bg-amber-200 transition"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-700" />
                Sugerir clave
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <input
                  type="text"
                  maxLength={8}
                  value={claveInput}
                  onChange={(e) => setClaveInput(e.target.value)}
                  placeholder="ej. 53131602"
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Descripción del catálogo SAT..."
                  className="w-full px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500 text-slate-600 bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clave de Unidad
                </label>
                <select
                  value={unidadInput}
                  onChange={(e) => setUnidadInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                >
                  <option value="H87">H87 - Pieza</option>
                  <option value="XPK">XPK - Paquete</option>
                  <option value="KGM">KGM - Kilogramo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Objeto de Impuesto
                </label>
                <input
                  type="text"
                  disabled
                  value="02 - Sí objeto de impuesto"
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-slate-100 text-slate-600"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
              💡 <b>Ventaja de ahorro de tiempo:</b> Una vez confirmada y guardada, esta clave SAT queda registrada de manera permanente en la base de datos y <b>nunca se volverá a preguntar</b> para este SKU en futuras cargas.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Resolver más tarde
          </button>

          <button
            type="button"
            disabled={loading || !claveInput}
            onClick={handleSaveAndConfirm}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 transition"
          >
            {loading ? (
              "Guardando..."
            ) : (
              <>
                <Check className="h-4 w-4" />
                Confirmar y guardar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

