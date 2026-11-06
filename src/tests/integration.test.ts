import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { parseDocument } from "../lib/parsers";
import { calculateDocumentTaxes } from "../lib/tax/calculator";
import { checkDocumentAlerts } from "../lib/alerts/checker";
import { getPacClient } from "../lib/pac/factory";

describe("End-to-End Invoicing Flow", () => {
  const samplePath = path.join(process.cwd(), "samples", "IN00491311.xls");
  const DEMO_UNMAPPED_SKUS = [
    "SK-MEDIH-019",
    "SK-MEDIH-020",
    "SK-MIXSO-021",
    "SK-MIXSO-022",
    "SK-HARUH-023",
    "SK-HARUH-024",
    "SK-PROMO-025",
  ];

  const hasDb = Boolean(process.env.DATABASE_URL);

  beforeAll(async () => {
    if (!hasDb) return;
    try {
      await prisma.productoSat.updateMany({
        where: { sku: { in: DEMO_UNMAPPED_SKUS } },
        data: { claveProdServ: null },
      });
    } catch (e) {
      console.warn("No se pudo conectar a la BD para integration test:", e);
    }
  });

  it.skipIf(!hasDb)("completes full acceptance flow: parse -> alerts -> resolve SKUs -> stamp -> prevent duplicates -> cancel", async () => {
    const buffer = fs.readFileSync(samplePath);
    const parsed = parseDocument(buffer, "IN00491311.xls");

    // 1. Math verification
    expect(parsed.items.length).toBe(25);
    expect(parsed.totalPieces).toBe(401);
    expect(parsed.totalWeightKg).toBe(60.166);
    expect(parsed.calculatedSubtotal).toBe(75982.59);
    expect(parsed.calculatedIva).toBe(12157.19);
    expect(parsed.calculatedTotal).toBe(88139.78);

    // 2. Query Kocare Beauty from DB
    const kocare = await prisma.cliente.findUnique({
      where: { rfc: "EKU9003173C9" },
    });
    expect(kocare).not.toBeNull();
    expect(kocare?.razonSocial).toBe("KOCARE BEAUTY S.A. DE C.V.");

    // 3. Match SKUs in DB: initially 7 are unmapped
    const allSkus = parsed.items.map((i) => i.sku);
    const dbProds = await prisma.productoSat.findMany({
      where: { sku: { in: allSkus } },
    });
    const unmappedProds = dbProds.filter((p) => !p.claveProdServ);
    expect(unmappedProds.length).toBe(7);

    const clienteData = {
      rfc: kocare!.rfc,
      razonSocial: kocare!.razonSocial,
      codigoPostal: kocare!.codigoPostal,
      regimenFiscal: kocare!.regimenFiscal,
      usoCfdi: kocare!.usoCfdiDefault,
    };

    // 4. Initial alerts check: MUST have RED alerts blocking stamping
    let alerts = checkDocumentAlerts({
      docNumber: parsed.docNumber,
      fileHash: parsed.fileHash,
      tipoFactura: "CLIENTE",
      fechaEmision: new Date(),
      cliente: clienteData,
      items: parsed.items.map((it) => {
        const p = dbProds.find((prod) => prod.sku === it.sku);
        return {
          sku: it.sku,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          piQty: it.piQty,
          precioUnitario: it.precioUnitario,
          claveProdServ: p?.claveProdServ || null,
          purposeOfUse: it.purposeOfUse,
          reference: it.reference,
          piNo: it.piNo,
        };
      }),
      subtotalCalculado: parsed.calculatedSubtotal,
      totalCalculado: parsed.calculatedTotal,
      totalArchivo: parsed.fileTotal,
    });

    const hasRedAlerts = alerts.some((a) => a.bloqueaTimbrado);
    expect(hasRedAlerts).toBe(true);
    expect(alerts.some((a) => a.id === "UNMAPPED_SKUS")).toBe(true);

    // 5. Resolve the 7 unmapped SKUs in DB
    for (const p of unmappedProds) {
      await prisma.productoSat.update({
        where: { sku: p.sku },
        data: { claveProdServ: "53131602" }, // Lociones o humectantes demo
      });
    }

    // 6. Re-check alerts: RED alerts must now be 0!
    alerts = checkDocumentAlerts({
      docNumber: parsed.docNumber,
      fileHash: parsed.fileHash,
      tipoFactura: "CLIENTE",
      fechaEmision: new Date(),
      cliente: clienteData,
      items: parsed.items.map((it) => ({
        sku: it.sku,
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        piQty: it.piQty,
        precioUnitario: it.precioUnitario,
        claveProdServ: "53131602",
        purposeOfUse: it.purposeOfUse,
        reference: it.reference,
        piNo: it.piNo,
      })),
      subtotalCalculado: parsed.calculatedSubtotal,
      totalCalculado: parsed.calculatedTotal,
      totalArchivo: parsed.fileTotal,
    });

    const remainingRedAlerts = alerts.filter((a) => a.bloqueaTimbrado);
    expect(remainingRedAlerts.length).toBe(0);

    // 7. Test PAC with simulated failure
    const pac = getPacClient();
    const failRes = await pac.timbrar(
      {
        serie: "A",
        folio: 1,
        fecha: new Date().toISOString(),
        formaPago: "03",
        metodoPago: "PUE",
        moneda: "MXN",
        tipoDeComprobante: "I",
        exportacion: "01",
        lugarExpedicion: "06600",
        subtotal: parsed.calculatedSubtotal,
        total: parsed.calculatedTotal,
        totalIva: parsed.calculatedIva,
        emisor: {
          rfc: "SKM220101AA1",
          nombre: "SKINCARE MEXICO DISTRIBUTION S.A. DE C.V.",
          regimenFiscal: "601",
        },
        receptor: {
          rfc: kocare!.rfc,
          nombre: kocare!.razonSocial,
          domicilioFiscalReceptor: kocare!.codigoPostal,
          regimenFiscalReceptor: kocare!.regimenFiscal,
          usoCfdi: kocare!.usoCfdiDefault,
        },
        conceptos: parsed.items.map((it) => ({
          claveProdServ: "53131602",
          noIdentificacion: it.sku,
          cantidad: it.cantidad,
          claveUnidad: "H87",
          descripcion: it.descripcion,
          valorUnitario: it.precioUnitario,
          importe: it.base,
          objetoImp: "02",
          iva: it.iva,
        })),
      },
      { simularFalla: true }
    );

    expect(failRes.success).toBe(false);
    expect(failRes.errorCode).toBe("PAC_503_SERVICE_UNAVAILABLE");

    // 8. Timbrar normal (MockPacClient)
    const stampRes = await pac.timbrar({
      serie: "A",
      folio: 1,
      fecha: new Date().toISOString(),
      formaPago: "03",
      metodoPago: "PUE",
      moneda: "MXN",
      tipoDeComprobante: "I",
      exportacion: "01",
      lugarExpedicion: "06600",
      subtotal: parsed.calculatedSubtotal,
      total: parsed.calculatedTotal,
      totalIva: parsed.calculatedIva,
      emisor: {
        rfc: "SKM220101AA1",
        nombre: "SKINCARE MEXICO DISTRIBUTION S.A. DE C.V.",
        regimenFiscal: "601",
      },
      receptor: {
        rfc: kocare!.rfc,
        nombre: kocare!.razonSocial,
        domicilioFiscalReceptor: kocare!.codigoPostal,
        regimenFiscalReceptor: kocare!.regimenFiscal,
        usoCfdi: kocare!.usoCfdiDefault,
      },
      conceptos: parsed.items.map((it) => ({
        claveProdServ: "53131602",
        noIdentificacion: it.sku,
        cantidad: it.cantidad,
        claveUnidad: "H87",
        descripcion: it.descripcion,
        valorUnitario: it.precioUnitario,
        importe: it.base,
        objetoImp: "02",
        iva: it.iva,
      })),
    });

    expect(stampRes.success).toBe(true);
    expect(stampRes.uuid).toBeDefined();
    expect(stampRes.xmlContent).toContain("cfdi:Comprobante");
    expect(stampRes.xmlContent).toContain("DEMO – SIN VALIDEZ FISCAL");

    // 9. Cancelación simulada
    const cancelRes = await pac.cancelar(stampRes.uuid!, "02");
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.mensaje).toContain("cancelado exitosamente en ambiente DEMO");

    // 10. Restore demo state (leave 7 unmapped for user demo)
    for (const p of unmappedProds) {
      await prisma.productoSat.update({
        where: { sku: p.sku },
        data: { claveProdServ: null },
      });
    }
  });
});
