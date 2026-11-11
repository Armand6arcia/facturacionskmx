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

  it("parses CSV invoice without SKU column (StyleKorean format C)", () => {
    const rawCsv = `,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,"
TEL : , FAX : , E-Mail : Sand@stylekorean.mx",,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,INVOICE,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,No. : IN00493733,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,Invoice Date :           ,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,SOLD TO,,,,,SkinloversMX,,,,,,,,,CONTACT,,,,,,,,,sandra,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,ATTN,,,,,Gustavo Mejia,,,,,,,,,TEL,,,,,,,,,,,,,,,
,,TEL,,,,,662 188 0077,,,,,,,,,CUSTOMER PO#,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,VAT ID,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,SHIP TO,,,,,"GUSTAVO ADOLFO MEJIA SANTELLANES
",,,,,,,,,BILL TO,,,,"GUSTAVO ADOLFO MEJIA SANTELLANES
",,,,,,,,,,,
,,ATTN,,,,,Gustavo Mejia,,,,,,,,,ATTN,,,,Gustavo Mejia,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,TEL,,,,,,,,,,,,,,TEL,,,,,,,,,,,,,,,
,,FAX,,,,,,,,,,,,,,FAX,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,SENDER VAT No,,,,,,,,,,,,,,DISCHARGING TO,,,,,,,,,,,Mexico,,,,
,,BUSINESS TYPE,,,,,,,MX-DOMESTIC (+IVA),,,,,,,FREIGHT TERMS,,,,,,,,,,,EX-WAREHOUSE,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,SHIP VIA,,,,,,,,Envia.com,,,,,,PAYMENT,,,,,,,,,,,T.T IN ADVANCE,,,,
,,AIRWAY BILL#,,,,,,,,,,,,,,TOTAL AMOUNT,,,,,,,,,,,"60,821.77 MXN",,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,ORIGINS,,,,,,,,KOREA,,,,,,,,,,,,,,,,,,,,,
,,REMARK,,,,,,,,● PROMO 1,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,IDX,,,,DESCRIPTION,,,,,,BRAND,,,,,,,HS CODE,,,,,Q'TY,,,,,,PRICE,,AMOUNT
,1.0,,,,(Renew) Oil Control Light Sunscreen 40ml,,,,,,celimax,,,,,,,3304.99.2000,,,,,4,,,,,,153.65,,614.60
,2.0,,,,THE VITA-A Retinal Shot Tightening Booster 15ml,,,,,,celimax,,,,,,,3304.99.1000,,,,,40,,,,,,220.00,,"8,800.00"
,3.0,,,,"[Renew] 147 Barrier Cream 50ml",,,,,,Dr.Althea,,,,,,,3304.99.1000,,,,,20,,,,,,247.45,,"4,949.00"
,4.0,,,,"[Renew] 345 Relief Cream 50ml",,,,,,Dr.Althea,,,,,,,3304.99.1000,,,,,40,,,,,,242.09,,"9,683.60"
,5.0,,,,0.1% Gentle Retinol Serum 30ml,,,,,,Dr.Althea,,,,,,,3304.99.1000,,,,,5,,,,,,183.30,,916.50
,6.0,,,,Aqua Glowing Sunscreen 45ml,,,,,,Dr.Althea,,,,,,,3304.99.2000,,,,,10,,,,,,175.32,,"1,753.20"
,7.0,,,,(Renew) Collagen Coating Hair Muscle Treatment Rinse (CER-100) 500ml,,,,,,Elizavecca,,,,,,,3305.90.1000,,,,,20,,,,,,106.17,,"2,123.40"
,8.0,,,,(Renew) Milky Piggy Collagen Ceramide Coating Protein Treatment(CER-100) 100ml,,,,,,Elizavecca,,,,,,,3305.90.2000,,,,,20,,,,,,54.96,,"1,099.20"
,9.0,,,,"[RENEW] PDRN PINK COLLAGEN CAPSULE CREAM 55g",,,,,,Medicube,,,,,,,3304.99.1000,,,,,40,,,,,,271.39,,"10,855.60"
,10.0,,,,COLLAGEN JELLY CREAM 110ml,,,,,,Medicube,,,,,,,3304.99.1000,,,,,12,,,,,,233.87,,"2,806.44"
,11.0,,,,PDRN PINK PEPTIDE SERUM 30ML,,,,,,Medicube,,,,,,,3304.99.1000,,,,,2,,,,,,0.00,,0.00
,12.0,,,,PDRN PINK PEPTIDE SERUM 30ML,,,,,,Medicube,,,,,,,3304.99.1000,,,,,20,,,,,,184.55,,"3,691.00"
,13.0,,,,Bean Essence 50ml,,,,,,MIXSOON,,,,,,,3304.99.1000,,,,,5,,,,,,250.10,,"1,250.50"
,14.0,,,,Madagascar Centella Light Cleansing OIl 200ml,,,,,,Skin1004,,,,,,,3401.30.1000,,,,,10,,,,,,194.71,,"1,947.10"
,15.0,,,,Madagascar Centella Poremizing Quick Clay Stick Mask 27g,,,,,,Skin1004,,,,,,,3401.30.1000,,,,,8,,,,,,169.67,,"1,357.36"
,16.0,,,,"[GL] Collagen Brightening Eye Gel Cream",,,,,,TOCOBO,,,,,,,3304.99.1000,,,,,5,,,,,,117.01,,585.05
,SUBTOTAL,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,"52,432.55"
,IVA 16%,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,"8,389.22"
,TOTAL,,,,,,,,,,,,,,,,,,,,,,261,,,,,,MXN,,"60,821.77"
,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,AUTHORIZED SIGNATURE OF STYLEKOREAN MX S. DE R.L. DE C.V..,,,,,,,,,,,,,,,`;

    const buffer = Buffer.from(rawCsv, "utf-8");
    const parsed = parseDocument(buffer, "SkinloversMX.csv");

    expect(parsed.docNumber).toBe("IN00493733");
    expect(parsed.headerMetadata.suggestedPaymentForm).toBe("03");
    expect(parsed.items.length).toBe(16);
    expect(parsed.totalPieces).toBe(261);

    // SKUs are empty strings (no SKU column in this file)
    parsed.items.forEach((it) => {
      expect(it.sku).toBe("");
      expect(it.descripcion).toBeTruthy();
    });

    // Check specific items
    expect(parsed.items[0].descripcion).toBe("celimax - (Renew) Oil Control Light Sunscreen 40ml");
    expect(parsed.items[0].cantidad).toBe(4);
    expect(parsed.items[0].precioUnitario).toBe(153.65);
    expect(parsed.items[0].base).toBe(614.60);

    // Promo item with 0.00 price
    const promo = parsed.items[10];
    expect(promo.descripcion).toBe("Medicube - PDRN PINK PEPTIDE SERUM 30ML");
    expect(promo.cantidad).toBe(2);
    expect(promo.precioUnitario).toBe(0);

    // Totals match file
    expect(parsed.calculatedSubtotal).toBe(52432.55);
    expect(parsed.fileTotal).toBe(60821.77);
  });
});
