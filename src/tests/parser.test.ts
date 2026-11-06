import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseDocument, formatInvoiceDescription } from "../lib/parsers";
import { detectFormat } from "../lib/parsers/detector";

describe("Parser tests", () => {
  const sampleHtmlPath = path.join(process.cwd(), "samples", "IN00491311.xls");
  const sampleBinPath = path.join(process.cwd(), "samples", "InvoiceIntg.xls");

  it("detects HTML format by content, not extension", () => {
    const buffer = fs.readFileSync(sampleHtmlPath);
    const format = detectFormat(buffer);
    expect(format).toBe("HTML_XLS");
  });

  it("detects binary Excel format by content", () => {
    const buffer = fs.readFileSync(sampleBinPath);
    const format = detectFormat(buffer);
    expect(format).toBe("BINARY_XLS");
  });

  it("parses IN00491311.xls and matches the exact expected values", () => {
    const buffer = fs.readFileSync(sampleHtmlPath);
    const parsed = parseDocument(buffer, "IN00491311.xls");

    expect(parsed.docNumber).toBe("IN00491311");
    expect(parsed.format).toBe("HTML_XLS");
    expect(parsed.items.length).toBe(25);
    expect(parsed.totalPieces).toBe(401);
    expect(parsed.totalWeightKg).toBe(60.166);

    // Exact expected tax calculations
    expect(parsed.calculatedSubtotal).toBe(75982.59);
    expect(parsed.calculatedIva).toBe(12157.19);
    expect(parsed.calculatedTotal).toBe(88139.78);

    // Barcode cleaning and Brand - Product Name description test
    const promoItem = parsed.items.find((i) => i.sku === "SK-PROMO-025");
    expect(promoItem?.barcode).toBe("8809541379468");
    expect(promoItem?.purposeOfUse).toContain("PROMO");
    expect(promoItem?.reference).toBe("4pcs faltante");
    expect(promoItem?.descripcion).toBe("K-Beauty Lab - K-Beauty Deluxe Sample Kit (PROMO)");

    const firstItem = parsed.items.find((i) => i.sku === "SK-COSRX-001");
    expect(firstItem?.descripcion).toBe("COSRX - Advanced Snail 96 Mucin Power Essence 100ml");

    // Line quantity difference test
    const diffQtyItem = parsed.items.find((i) => i.sku === "SK-ROUND-013");
    expect(diffQtyItem?.piQty).toBe(18);
    expect(diffQtyItem?.cantidad).toBe(15);
    expect(diffQtyItem?.descripcion).toBe("Round Lab - 1025 Dokdo Toner 200ml");
  });

  it("parses InvoiceIntg.xls and extracts header metadata", () => {
    const buffer = fs.readFileSync(sampleBinPath);
    const parsed = parseDocument(buffer, "InvoiceIntg.xls");

    expect(parsed.format).toBe("BINARY_XLS");
    expect(parsed.items.length).toBe(25);
    expect(parsed.headerMetadata.docNumber).toBe("IN-2026-0889");
    expect(parsed.headerMetadata.soldTo).toContain("KOCARE BEAUTY");
    expect(parsed.headerMetadata.businessType).toBe("MX-DOMESTIC (+IVA)");
    expect(parsed.headerMetadata.suggestedInvoiceType).toBe("CLIENTE");
    expect(parsed.headerMetadata.suggestedPaymentForm).toBe("03");
    expect(parsed.headerMetadata.dateAmbiguous).toBe(true);
  });

  it("formats invoice description as 'Marca - Nombre del producto'", () => {
    expect(formatInvoiceDescription("COSRX", "COSRX Advanced Snail 96 Mucin Power Essence 100ml"))
      .toBe("COSRX - Advanced Snail 96 Mucin Power Essence 100ml");

    expect(formatInvoiceDescription("Beauty of Joseon", "Beauty of Joseon Relief Sun Rice + Probiotics 50ml"))
      .toBe("Beauty of Joseon - Relief Sun Rice + Probiotics 50ml");

    expect(formatInvoiceDescription("K-Beauty Lab", "K-Beauty Deluxe Sample Kit (PROMO)"))
      .toBe("K-Beauty Lab - K-Beauty Deluxe Sample Kit (PROMO)");

    expect(formatInvoiceDescription("COSRX", "Advanced Snail 96 Mucin Power Essence 100ml"))
      .toBe("COSRX - Advanced Snail 96 Mucin Power Essence 100ml");

    expect(formatInvoiceDescription("COSRX", "COSRX - Advanced Snail 96 Mucin Power Essence 100ml"))
      .toBe("COSRX - Advanced Snail 96 Mucin Power Essence 100ml");

    expect(formatInvoiceDescription("", "Solo Producto"))
      .toBe("Solo Producto");
  });
});
