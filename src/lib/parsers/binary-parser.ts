import * as XLSX from "xlsx";
import { ParsedDocument, ParsedItem, HeaderMetadata } from "./types";
import { computeFileHash } from "./detector";
import { round2 } from "../tax/calculator";
import { formatInvoiceDescription } from "./format-description";

export function parseBinaryXls(buffer: Buffer, filename: string): ParsedDocument {
  const fileHash = computeFileHash(buffer);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to array of rows
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  const metadata: HeaderMetadata = {
    suggestedInvoiceType: "CLIENTE",
    suggestedPaymentForm: "03", // Transferencia por defecto
  };

  let headerRowIndex = -1;
  let colMap = new Map<string, number>();

  // 1. Scan for header metadata in the upper rows
  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    const rowStr = row.map((cell) => String(cell).trim()).join(" ");

    // Check No.
    const noMatch = rowStr.match(/No\.\s*:\s*([A-Za-z0-9-_]+)/i);
    if (noMatch && !metadata.docNumber) {
      metadata.docNumber = noMatch[1];
    }

    // Check Date: e.g. "Date : 11-03-2026"
    const dateMatch = rowStr.match(/Date\s*:\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
    if (dateMatch) {
      metadata.dateStr = dateMatch[1];
      // User requested: interpret as MM-DD-YYYY and flag to confirm
      const parts = metadata.dateStr.split(/[-/]/);
      if (parts.length === 3) {
        const mm = parts[0].padStart(2, "0");
        const dd = parts[1].padStart(2, "0");
        const yyyy = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        metadata.dateParsed = `${yyyy}-${mm}-${dd}`;
        metadata.dateAmbiguous = true; // Flaguear para pedir confirmación
      }
    }

    // Check SOLD TO / BILL TO
    const soldToMatch = rowStr.match(/SOLD\s+TO\s*\/\s*BILL\s+TO\s*:\s*([^,\n\r]+)/i);
    if (soldToMatch) {
      metadata.soldTo = soldToMatch[1].trim();
    }

    // Check BUSINESS TYPE
    const bTypeMatch = rowStr.match(/BUSINESS\s+TYPE\s*:\s*([^,\n\r]+)/i);
    if (bTypeMatch) {
      metadata.businessType = bTypeMatch[1].trim();
      const bUpper = metadata.businessType.toUpperCase();
      if (bUpper.includes("DOMESTIC") || bUpper.includes("NACIONAL")) {
        metadata.suggestedInvoiceType = "CLIENTE";
      } else if (bUpper.includes("EXPORT") || bUpper.includes("EXTRANJERO")) {
        metadata.suggestedInvoiceType = "GLOBAL_EXTRANJERO";
      } else if (bUpper.includes("TRASLADO") || bUpper.includes("CARTA PORTE")) {
        metadata.suggestedInvoiceType = "TRASLADO";
      } else {
        metadata.suggestedInvoiceType = "CLIENTE";
      }
    }

    // Check PAYMENT TERMS
    const pTermsMatch = rowStr.match(/PAYMENT\s+TERMS\s*:\s*([^,\n\r]+)/i);
    if (pTermsMatch) {
      metadata.paymentTerms = pTermsMatch[1].trim();
      const ptUpper = metadata.paymentTerms.toUpperCase();
      if (ptUpper.includes("T.T") || ptUpper.includes("TRANSFER") || ptUpper.includes("ADVANCE")) {
        metadata.suggestedPaymentForm = "03"; // Transferencia
      } else if (ptUpper.includes("CASH") || ptUpper.includes("EFECTIVO")) {
        metadata.suggestedPaymentForm = "01"; // Efectivo
      } else if (ptUpper.includes("CARD") || ptUpper.includes("TARJETA")) {
        metadata.suggestedPaymentForm = "04"; // Tarjeta
      }
    }

    // Check REMARK
    const remarkMatch = rowStr.match(/REMARK\s*:\s*([^,\n\r]+)/i);
    if (remarkMatch) {
      metadata.remark = remarkMatch[1].trim();
    }

    // Check for table header row with IDX and DESCRIPTION
    const hasIdx = row.some((c) => String(c).trim().toUpperCase() === "IDX");
    const hasDesc = row.some((c) => /DESCRIPTION/i.test(String(c).trim()));

    if (hasIdx && hasDesc) {
      headerRowIndex = r;
      row.forEach((cell, idx) => {
        const text = String(cell).trim().toUpperCase();
        if (text) {
          colMap.set(text, idx);
        }
      });
      break;
    }
  }

  // Fallback docNumber if not in header
  if (!metadata.docNumber) {
    const base = filename.split(/[\\/]/).pop() || filename;
    metadata.docNumber = base.replace(/\.[^/.]+$/, "");
  }

  const items: ParsedItem[] = [];

  const getCol = (names: string[]): number => {
    for (const name of names) {
      for (const [key, idx] of Array.from(colMap.entries())) {
        if (key === name || key.includes(name)) return idx;
      }
    }
    return -1;
  };

  const idxCol = getCol(["IDX"]);
  const skuCol = getCol(["SKU", "ITEM CODE"]);
  const descCol = getCol(["DESCRIPTION", "PRODUCT NAME", "DESC"]);
  const brandCol = getCol(["BRAND"]);
  const hsCodeCol = getCol(["HS CODE", "HSCODE"]);
  const barcodeCol = getCol(["BARCODE", "UPC", "EAN"]);
  const qtyCol = getCol(["Q'TY", "QTY", "QUANTITY"]);
  const priceCol = getCol(["PRICE", "UNIT PRICE"]);
  const amountCol = getCol(["AMOUNT", "TOTAL"]);

  let fileSubtotal = 0;
  let fileIva = 0;
  let fileTotal = 0;

  if (headerRowIndex >= 0) {
    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      const rowStr = row.map((c) => String(c).trim()).join(" ");

      // Stop at row "TOTAL"
      if (/^TOTAL/i.test(rowStr) || (idxCol >= 0 && /^TOTAL/i.test(String(row[idxCol]).trim()))) {
        // Read file total if available
        if (amountCol >= 0 && row[amountCol]) {
          const tVal = parseFloat(String(row[amountCol]).replace(/[^0-9.-]/g, ""));
          if (!isNaN(tVal) && tVal > 0) {
            fileTotal = tVal;
          }
        }
        break;
      }

      const getCellVal = (cIdx: number): string => {
        if (cIdx < 0 || cIdx >= row.length) return "";
        return String(row[cIdx]).trim();
      };

      const sku = getCellVal(skuCol);
      if (!sku) continue;

      const desc = getCellVal(descCol) || sku;
      const brand = getCellVal(brandCol);
      const hsCode = getCellVal(hsCodeCol);
      const rawBarcode = getCellVal(barcodeCol);
      const cleanBarcode = rawBarcode.replace(/[\[\]\s]/g, "");

      const parseNum = (val: string): number => {
        const clean = val.replace(/[^0-9.-]/g, "");
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
      };

      const qty = parseNum(getCellVal(qtyCol));
      const unitPrice = parseNum(getCellVal(priceCol));
      const rowAmount = parseNum(getCellVal(amountCol));

      // In format B: AMOUNT already INCLUDES IVA (base + 16%)
      // If price was net base:
      let base = round2(qty * unitPrice);
      let iva = round2(base * 0.16);
      let importe = round2(base + iva);

      // Verify if rowAmount was indeed gross (base + iva)
      if (rowAmount > 0 && Math.abs(rowAmount - (base + iva)) <= 0.05) {
        importe = rowAmount;
      }

      items.push({
        sku,
        descripcion: formatInvoiceDescription(brand, desc),
        brand,
        cantidad: qty,
        piQty: qty,
        precioUnitario: unitPrice,
        base,
        iva,
        importe,
        barcode: cleanBarcode,
        hsCode,
        purposeOfUse: "COMMERCIAL SALE",
      });
    }
  }

  // Recalculate totals
  let calculatedSubtotal = 0;
  let calculatedIva = 0;
  let totalPieces = 0;

  for (const it of items) {
    calculatedSubtotal = round2(calculatedSubtotal + it.base);
    calculatedIva = round2(calculatedIva + it.iva);
    totalPieces += Math.round(it.cantidad);
  }

  const calculatedTotal = round2(calculatedSubtotal + calculatedIva);

  if (fileTotal === 0) {
    fileTotal = calculatedTotal;
  }
  fileSubtotal = calculatedSubtotal;
  fileIva = calculatedIva;

  return {
    docNumber: metadata.docNumber || filename,
    fileHash,
    format: "BINARY_XLS",
    headerMetadata: metadata,
    items,
    fileSubtotal,
    fileIva,
    fileTotal,
    calculatedSubtotal,
    calculatedIva,
    calculatedTotal,
    totalPieces,
    totalWeightKg: 0,
  };
}
