export interface ParsedItem {
  piNo?: string;
  sku: string;
  descripcion: string;
  brand?: string;
  cantidad: number; // Invc Qty
  piQty?: number;
  precioUnitario: number; // WholeSale Price
  rateReferencia?: number; // Rate informativo
  retailPrice?: number; // Retail informativo
  base: number;
  iva: number;
  importe: number;
  barcode?: string;
  hsCode?: string;
  weightKg?: number;
  cbm?: number;
  purposeOfUse?: string;
  reference?: string;
  excluido?: boolean;
  descuentoCien?: boolean;
}

export interface HeaderMetadata {
  docNumber?: string;
  dateStr?: string;
  dateParsed?: string; // ISO
  dateAmbiguous?: boolean;
  soldTo?: string;
  businessType?: string;
  paymentTerms?: string;
  remark?: string;
  suggestedInvoiceType?: "CLIENTE" | "GLOBAL_NACIONAL" | "GLOBAL_EXTRANJERO" | "TRASLADO";
  suggestedPaymentForm?: string;
}

export interface ParsedDocument {
  docNumber: string;
  fileHash: string;
  format: "HTML_XLS" | "BINARY_XLS";
  headerMetadata: HeaderMetadata;
  items: ParsedItem[];
  fileSubtotal: number;
  fileIva: number;
  fileTotal: number;
  calculatedSubtotal: number;
  calculatedIva: number;
  calculatedTotal: number;
  totalPieces: number;
  totalWeightKg: number;
}

