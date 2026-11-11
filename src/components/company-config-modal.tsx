"use client";

import { useState, useEffect } from "react";
import { X, Building2, Check, ShieldCheck, Server, AlertCircle } from "lucide-react";

interface CompanyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaData?: any;
  onSaved?: (empresa: any) => void;
}

export function CompanyConfigModal({
  isOpen,
  onClose,
  empresaData,
  onSaved,
}: CompanyConfigModalProps) {
  const [razonSocial, setRazonSocial] = useState("STYLEKOREAN MX");
  const [rfc, setRfc] = useState("SMX250408I48");
  const [regimenFiscal, setRegimenFiscal] = useState("601");
  const [codigoPostal, setCodigoPostal] = useState("54090");
  const [serie, setSerie] = useState("F");
  const [pacProvider, setPacProvider] = useState("mock");
  const [facturaApiKey, setFacturaApiKey] = useState("");
  const [facturaSecretKey, setFacturaSecretKey] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    // Load from localStorage if present
    const saved = localStorage.getItem("factura_skmx_empresa");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.razonSocial) setRazonSocial(parsed.razonSocial);
        if (parsed.rfc) setRfc(parsed.rfc);
        if (parsed.regimenFiscal) setRegimenFiscal(parsed.regimenFiscal);
        if (parsed.codigoPostal) setCodigoPostal(parsed.codigoPostal);
        if (parsed.serie) setSerie(parsed.serie);
        if (parsed.pacProvider) setPacProvider(parsed.pacProvider);
        if (parsed.facturaApiKey) setFacturaApiKey(parsed.facturaApiKey);
        if (parsed.facturaSecretKey) setFacturaSecretKey(parsed.facturaSecretKey);
        return;
      } catch (e) {}
    }

    if (empresaData) {
      if (empresaData.razonSocial) setRazonSocial(empresaData.razonSocial);
      if (empresaData.rfc) setRfc(empresaData.rfc);
      if (empresaData.regimenFiscal) setRegimenFiscal(empresaData.regimenFiscal);
      if (empresaData.codigoPostal) setCodigoPostal(empresaData.codigoPostal);
      if (empresaData.seriePorDefecto) setSerie(empresaData.seriePorDefecto);
      if (empresaData.pacProvider) setPacProvider(empresaData.pacProvider);
    }
  }, [empresaData, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const config = {
      razonSocial: razonSocial.trim().toUpperCase(),
      rfc: rfc.trim().toUpperCase(),
      regimenFiscal,
      codigoPostal: codigoPostal.trim(),
      serie: serie.trim().toUpperCase(),
      pacProvider,
      facturaApiKey: facturaApiKey.trim(),
      facturaSecretKey: facturaSecretKey.trim(),
    };
    localStorage.setItem("factura_skmx_empresa", JSON.stringify(config));
    setSavedSuccess(true);
    if (onSaved) onSaved(config);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Mi Empresa Emisora</h3>
              <p className="text-xs text-slate-500">Datos fiscales de emisión de CFDI 4.0</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {savedSuccess && (
            <div className="flex items-center gap-2 p-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Check className="h-4 w-4 shrink-0" />
              <span>Configuración guardada correctamente.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Razón Social de la Empresa Emisora
            </label>
            <input
              type="text"
              required
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value.toUpperCase())}
              placeholder="STYLEKOREAN MX"
              className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                RFC Emisor
              </label>
              <input
                type="text"
                required
                maxLength={13}
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                placeholder="SMX250408I48"
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                C.P. de Expedición
              </label>
              <input
                type="text"
                required
                maxLength={5}
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value)}
                placeholder="54090"
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Régimen Fiscal
              </label>
              <select
                value={regimenFiscal}
                onChange={(e) => setRegimenFiscal(e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="601">601 - General de Ley Personas Morales</option>
                <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Serie por Defecto
              </label>
              <input
                type="text"
                maxLength={5}
                value={serie}
                onChange={(e) => setSerie(e.target.value.toUpperCase())}
                placeholder="A"
                className="w-full px-3.5 py-2.5 border rounded-xl text-sm uppercase focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4 text-blue-600" />
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Conexión con PAC (Timbrado CFDI)
              </label>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Proveedor de Timbrado:</span>
                <span className="font-bold text-blue-700 px-2 py-0.5 bg-blue-100 rounded-md">
                  {pacProvider === "mock" ? "Simulador Realista (Mock)" : "Factura.com (Oficial)"}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                El sistema opera actualmente con timbres de prueba oficiales para simular folios fiscales (UUID), sellos y cadena original sin gastar créditos. Cuando recibas tus credenciales de Factura.com, se activarán automáticamente.
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
            >
              <Check className="h-4 w-4" />
              Guardar Configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

