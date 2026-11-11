"use client";

import { useState, useEffect } from "react";
import {
  X,
  ShoppingBag,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface ProductsSatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProductsSatModal({ isOpen, onClose }: ProductsSatModalProps) {
  const [productos, setProductos] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "mapeados" | "sinMapear">("todos");
  const [loading, setLoading] = useState(true);

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/productos-sat");
      const data = await res.json();
      if (data.productos) {
        setProductos(data.productos);
      }
    } catch (e) {
      console.error("Error al cargar productos SAT", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProductos();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = productos.filter((p) => {
    const matchesQuery =
      (p.sku && p.sku.toLowerCase().includes(query.toLowerCase())) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(query.toLowerCase())) ||
      (p.claveProdServ && p.claveProdServ.includes(query));

    if (!matchesQuery) return false;

    if (filtro === "mapeados") return Boolean(p.claveProdServ);
    if (filtro === "sinMapear") return !p.claveProdServ;
    return true;
  });

  const totalMapeados = productos.filter((p) => Boolean(p.claveProdServ)).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Catálogo de Productos y Claves SAT</h3>
              <p className="text-xs text-slate-500">Mapeo persistente de SKUs internos a Claves del SAT</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por SKU, descripción o clave SAT..."
              className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto justify-center">
            <button
              onClick={() => setFiltro("todos")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filtro === "todos"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos ({productos.length})
            </button>
            <button
              onClick={() => setFiltro("mapeados")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filtro === "mapeados"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mapeados ({totalMapeados})
            </button>
            <button
              onClick={() => setFiltro("sinMapear")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filtro === "sinMapear"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Por Mapear ({productos.length - totalMapeados})
            </button>
          </div>
        </div>

        {/* Product list table */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <span className="text-xs">Cargando catálogo SAT...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Tag className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No se encontraron productos</p>
              <p className="text-xs text-slate-500 mt-1">
                Los productos se sincronizan automáticamente cada vez que cargas una orden de venta.
              </p>
            </div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-100">
                      {p.sku}
                    </span>
                    {p.barcode && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        EAN: {p.barcode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 line-clamp-1">{p.descripcion}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {p.claveProdServ ? (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        {p.claveProdServ}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Unidad: {p.claveUnidad || "H87"}</p>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Sin mapear
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-slate-50/70 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Mostrando <b>{filtered.length}</b> de <b>{productos.length}</b> productos</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
