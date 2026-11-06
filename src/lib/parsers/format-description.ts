/**
 * Formatea la descripción de un concepto para factura como:
 * "Marca - Nombre del producto"
 * 
 * Evita duplicar la marca si el nombre del producto en el archivo original
 * ya comienza con el nombre de la marca.
 */
export function formatInvoiceDescription(
  brand?: string | null,
  productName?: string | null
): string {
  const b = (brand || "").trim();
  const p = (productName || "").trim();

  if (!b && !p) return "";
  if (!b) return p;
  if (!p) return b;

  // Si ya tiene el formato "Marca - ..."
  if (p.toLowerCase().startsWith(`${b.toLowerCase()} -`)) {
    const rest = p.slice(b.length).replace(/^[\s-]+/, "").trim();
    return rest ? `${b} - ${rest}` : b;
  }

  // Si el nombre del producto empieza con "Marca " (evita "COSRX - COSRX ...")
  if (p.toLowerCase().startsWith(`${b.toLowerCase()} `)) {
    const rest = p.slice(b.length).trim();
    return rest ? `${b} - ${rest}` : b;
  }

  // Caso estándar: "Marca - Nombre del producto"
  return `${b} - ${p}`;
}

