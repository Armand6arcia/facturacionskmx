export interface TaxLineInput {
  cantidad: number;
  precioUnitario: number;
  excluido?: boolean;
  descuentoCien?: boolean;
}

export interface TaxLineResult {
  base: number;
  iva: number;
  importe: number;
  descuento: number;
}

export interface TaxCalculationResult {
  subtotal: number;
  iva: number;
  total: number;
  totalPiezas: number;
  lines: TaxLineResult[];
  diferenciaConArchivo?: number;
  cuadraConArchivo: boolean;
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Cálculo de impuestos conforme a reglas del SAT CFDI 4.0:
 * - base de cada línea = round(cantidad * precio, 2)
 * - IVA de cada línea = round(base * 0.16, 2)
 * - subtotal = suma de bases; IVA = suma de IVA por línea; total = subtotal + IVA
 */
export function calculateLineTaxes(line: TaxLineInput): TaxLineResult {
  if (line.excluido) {
    return { base: 0, iva: 0, importe: 0, descuento: 0 };
  }

  const rawBase = round2(line.cantidad * line.precioUnitario);
  
  if (line.descuentoCien) {
    // Tratamiento PROMO: factura con descuento del 100%
    return {
      base: 0,
      iva: 0,
      importe: 0,
      descuento: rawBase,
    };
  }

  const iva = round2(rawBase * 0.16);
  const importe = round2(rawBase + iva);

  return {
    base: rawBase,
    iva,
    importe,
    descuento: 0,
  };
}

export function calculateDocumentTaxes(
  lines: TaxLineInput[],
  archivoSubtotal?: number,
  archivoTotal?: number,
  tasaIva: number = 0.16
): TaxCalculationResult {
  let subtotal = 0;
  let totalIva = 0;
  let totalPiezas = 0;

  const lineResults: TaxLineResult[] = lines.map((line) => {
    if (line.excluido) {
      return { base: 0, iva: 0, importe: 0, descuento: 0 };
    }
    totalPiezas += Math.round(line.cantidad);
    const res = calculateLineTaxes(line);
    subtotal = round2(subtotal + res.base);
    totalIva = round2(totalIva + res.iva);
    return res;
  });

  const total = round2(subtotal + totalIva);

  let cuadraConArchivo = true;
  let diferenciaConArchivo = 0;

  if (archivoTotal !== undefined && archivoTotal > 0) {
    diferenciaConArchivo = round2(Math.abs(total - archivoTotal));
    // Tolerancia estricta de 0.05 MXN
    cuadraConArchivo = diferenciaConArchivo <= 0.05;
  }

  return {
    subtotal,
    iva: totalIva,
    total,
    totalPiezas,
    lines: lineResults,
    diferenciaConArchivo,
    cuadraConArchivo,
  };
}

