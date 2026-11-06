"use client";

import { useState } from "react";
import { X, Building2, Check, AlertCircle } from "lucide-react";

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (client: any) => void;
}

export function NewClientModal({ isOpen, onClose, onClientCreated }: NewClientModalProps) {
  const [rfc, setRfc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [regimenFiscal, setRegimenFiscal] = useState("601");
  const [usoCfdi, setUsoCfdi] = useState("G03");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
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
    } catch (err: any) {
      setError(err.message || "Error al registrar cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800">Dar de alta nuevo cliente</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              RFC (12 o 13 caracteres)
            </label>
            <input
              type="text"
              required
              maxLength={13}
              value={rfc}
              onChange={(e) => setRfc(e.target.value.toUpperCase())}
              placeholder="EKU9003173C9"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Razón Social (sin régimen de capital, ej. KOCARE BEAUTY)
            </label>
            <input
              type="text"
              required
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value.toUpperCase())}
              placeholder="KOCARE BEAUTY S.A. DE C.V."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Código Postal (Domicilio Fiscal)
              </label>
              <input
                type="text"
                required
                maxLength={5}
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value)}
                placeholder="06600"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Régimen Fiscal
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
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Uso de CFDI por defecto
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
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              {loading ? (
                "Guardando..."
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Guardar Cliente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

