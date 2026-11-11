// src/lib/sat/catalog-defaults.ts
// Reglas y claves SAT por defecto oficiales para StyleKorean México

export const CLAVE_PROD_PRODUCTO_DEFAULT = "53131613"; // Cosméticos y artículos de tocador
export const CLAVE_UNIDAD_PRODUCTO_DEFAULT = "H87";      // Pieza
export const UNIDAD_PRODUCTO_DEFAULT = "Pieza";

export const CLAVE_PROD_ENVIO_DEFAULT = "78101800";    // Servicios de transporte y envío local/mensajería
export const CLAVE_UNIDAD_ENVIO_DEFAULT = "E48";        // Unidad de servicio
export const UNIDAD_ENVIO_DEFAULT = "Unidad de servicio";
export const DESCRIPCION_ENVIO_DEFAULT = "Servicio de envio";

/**
 * Detecta si un concepto corresponde a cobro de envío / flete (Deliveryfee)
 */
export function isDeliveryFeeItem(sku?: string | null, descripcion?: string | null): boolean {
  const s = (sku || "").toLowerCase().trim();
  const d = (descripcion || "").toLowerCase().trim();

  // Patrones frecuentes en exportaciones de StyleKorean y plataformas de comercio
  const regexEnvio = /delivery\s*fee|deliveryfee|servicio\s*de\s*env[ií]o|costo\s*de\s*env[ií]o|flete|envio|gastos\s*de\s*env[ií]o/i;

  return regexEnvio.test(s) || regexEnvio.test(d);
}

/**
 * Normaliza los datos fiscales SAT de una partida según las reglas de StyleKorean
 */
export function getSatMappingForConcepto(sku?: string | null, descripcion?: string | null) {
  const isEnvio = isDeliveryFeeItem(sku, descripcion);

  if (isEnvio) {
    return {
      isEnvio: true,
      claveProdServ: CLAVE_PROD_ENVIO_DEFAULT,
      claveUnidad: CLAVE_UNIDAD_ENVIO_DEFAULT,
      unidad: UNIDAD_ENVIO_DEFAULT,
      descripcion: DESCRIPCION_ENVIO_DEFAULT,
    };
  }

  return {
    isEnvio: false,
    claveProdServ: CLAVE_PROD_PRODUCTO_DEFAULT,
    claveUnidad: CLAVE_UNIDAD_PRODUCTO_DEFAULT,
    unidad: UNIDAD_PRODUCTO_DEFAULT,
    descripcion: descripcion || "Producto",
  };
}
