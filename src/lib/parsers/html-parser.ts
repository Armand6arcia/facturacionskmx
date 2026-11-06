import * as cheerio from "cheerio";
import { ParsedDocument, ParsedItem } from "./types";
import { computeFileHash } from "./detector";
import { round2 } from "../tax/calculator";
import { formatInvoiceDescription } from "./format-description";

export function parseHtmlXls(buffer: Buffer, filename: string): ParsedDocument {
  const fileHash = computeFileHash(buffer);
  const htmlContent = buffer.toString("utf-8");
  const $ = cheerio.load(htmlContent);

  // Extract document number from filename (e.g. IN00491311.xls -> IN00491311)
  const baseFilename = filename.split(/[\\/]/).pop() || filename;
  const docNumberMatch = baseFilename.match(/([A-Za-z0-9-_]+)\.xls/i);
  let docNumber = docNumberMatch ? docNumberMatch[1] : baseFilename.replace(/\.[^/.]+$/, "");
  if (!docNumber || docNumber === "export") {
    // Check title if filename was generic
    const titleText = $("title").text() || $("h1, h2").first().text();
    const titleMatch = titleText.match(/([A-Z]{2}\d+)/i);
    docNumber = titleMatch ? titleMatch[1] : `DOC-${Date.now()}`;
  }

  // Find table and map column headers by NAME
  const headersMap = new Map<string, number>();

  $("table").first().find("tr").each((rowIndex, rowElem) => {
    const $row = $(rowElem);
    const ths = $row.find("th");
    if (ths.length > 0 && headersMap.size === 0) {
      ths.each((colIndex, colElem) => {
        const text = $(colElem).text().trim().toLowerCase();
        headersMap.set(text, colIndex);
      });
    }
  });

  // Helper to normalize header lookup
  const getColIndex = (candidates: string[]): number => {
    for (const c of candidates) {
      const lower = c.toLowerCase();
      for (const [key, idx] of Array.from(headersMap.entries())) {
        if (key === lower || key.includes(lower)) {
          return idx;
        }
      }
    }
    return -1;
  };

  const piNoCol = getColIndex(["pi no", "pi_no", "pino"]);
  const skuCol = getColIndex(["sku", "item code", "code"]);
  const nameCol = getColIndex(["product name", "description", "item name", "name"]);
  const brandCol = getColIndex(["brand", "marca"]);
  const retailPriceCol = getColIndex(["retail price", "retail"]);
  const rateCol = getColIndex(["rate", "list price"]);
  const wholesalePriceCol = getColIndex(["wholesale price", "wholesale", "precio"]);
  const piQtyCol = getColIndex(["pi qty", "pi quantity"]);
  const invcQtyCol = getColIndex(["invc qty", "inv qty", "qty", "quantity"]);
  const amountCol = getColIndex(["amount", "importe"]);
  const vatCol = getColIndex(["vat", "iva"]);
  const cbmCol = getColIndex(["cbm"]);
  const weightCol = getColIndex(["weight(kg)", "weight", "peso"]);
  const purposeCol = getColIndex(["purpose of use", "purpose", "uso"]);
  const refCol = getColIndex(["reference", "ref", "referencia"]);
  const barcodeCol = getColIndex(["barcode", "upc", "ean"]);

  const items: ParsedItem[] = [];
  let fileSubtotal = 0;
  let fileIva = 0;
  let fileTotal = 0;

  // Process rows
  $("table").first().find("tbody tr, tr").each((_, rowElem) => {
    const $row = $(rowElem);
    const cells = $row.find("td");
    if (cells.length === 0) return;

    const rowText = $row.text().trim();
    // Check if this row is the "Total" row (ignore row and misaligned cells)
    if (/total/i.test(rowText) && cells.length < headersMap.size) {
      // It's the total row, extract file totals if visible for tolerance comparison
      cells.each((_, c) => {
        const val = parseFloat($(c).text().replace(/[^0-9.-]/g, ""));
        if (!isNaN(val)) {
          if (val > 50000 && fileSubtotal === 0) {
            fileSubtotal = val;
          } else if (val > 8000 && val < 20000 && fileIva === 0) {
            fileIva = val;
          }
        }
      });
      if (fileSubtotal > 0 && fileIva > 0) {
        fileTotal = round2(fileSubtotal + fileIva);
      }
      return;
    }

    const getCell = (colIdx: number): string => {
      if (colIdx < 0 || colIdx >= cells.length) return "";
      return $(cells[colIdx]).text().trim();
    };

    const sku = getCell(skuCol);
    if (!sku || /total/i.test(sku)) return;

    const piNo = getCell(piNoCol);
    const name = getCell(nameCol) || sku;
    const brand = getCell(brandCol);

    const parseNum = (str: string): number => {
      const clean = str.replace(/[^0-9.-]/g, "");
      const val = parseFloat(clean);
      return isNaN(val) ? 0 : val;
    };

    const retailPrice = parseNum(getCell(retailPriceCol));
    const rate = parseNum(getCell(rateCol));
    const wholesalePrice = parseNum(getCell(wholesalePriceCol));
    const piQty = parseNum(getCell(piQtyCol));
    const invcQty = parseNum(getCell(invcQtyCol));
    const fileLineAmount = parseNum(getCell(amountCol));
    const fileLineVat = parseNum(getCell(vatCol));
    const cbm = parseNum(getCell(cbmCol));
    const weightKg = parseNum(getCell(weightCol));
    const purposeOfUse = getCell(purposeCol);
    const reference = getCell(refCol);

    // Clean barcode: e.g. "[ 8809541379468 ]" -> "8809541379468"
    const rawBarcode = getCell(barcodeCol);
    const cleanBarcode = rawBarcode.replace(/[\[\]\s]/g, "");

    // Cantidad a facturar = Invc Qty
    // PRECIO A FACTURAR = WholeSale Price
    const base = round2(invcQty * wholesalePrice);
    const iva = round2(base * 0.16);
    const importe = round2(base + iva);

    items.push({
      piNo,
      sku,
      descripcion: formatInvoiceDescription(brand, name),
      brand,
      cantidad: invcQty,
      piQty: piQty > 0 ? piQty : invcQty,
      precioUnitario: wholesalePrice,
      rateReferencia: rate > 0 ? rate : undefined,
      retailPrice: retailPrice > 0 ? retailPrice : undefined,
      base,
      iva,
      importe,
      barcode: cleanBarcode,
      weightKg,
      cbm,
      purposeOfUse,
      reference,
    });
  });

  // Calculate totals
  let calculatedSubtotal = 0;
  let calculatedIva = 0;
  let totalPieces = 0;
  let totalWeightKg = 0;

  for (const it of items) {
    calculatedSubtotal = round2(calculatedSubtotal + it.base);
    calculatedIva = round2(calculatedIva + it.iva);
    totalPieces += Math.round(it.cantidad);
    totalWeightKg += it.weightKg || 0;
  }

  const calculatedTotal = round2(calculatedSubtotal + calculatedIva);
  totalWeightKg = Number(totalWeightKg.toFixed(3));

  if (fileTotal === 0) {
    fileSubtotal = calculatedSubtotal;
    fileIva = calculatedIva;
    fileTotal = calculatedTotal;
  }

  return {
    docNumber,
    fileHash,
    format: "HTML_XLS",
    headerMetadata: {
      docNumber,
    },
    items,
    fileSubtotal,
    fileIva,
    fileTotal,
    calculatedSubtotal,
    calculatedIva,
    calculatedTotal,
    totalPieces,
    totalWeightKg,
  };
}
