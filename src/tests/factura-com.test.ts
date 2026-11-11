import { describe, it, expect, vi, beforeEach } from "vitest";
import { FacturaComPacClient } from "../lib/pac/factura-com";
import { CfdiPayload } from "../lib/pac/pac-interface";

describe("FacturaComPacClient", () => {
  const mockPayload: CfdiPayload = {
    serie: "A",
    folio: 101,
    fecha: "2026-11-10T12:00:00",
    formaPago: "03",
    metodoPago: "PUE",
    moneda: "MXN",
    tipoDeComprobante: "I",
    exportacion: "01",
    lugarExpedicion: "06600",
    subtotal: 1000,
    total: 1160,
    totalIva: 160,
    emisor: {
      rfc: "SKM220101XYZ",
      nombre: "STYLE KOREAN MEXICO S.A. DE C.V.",
      regimenFiscal: "601",
    },
    receptor: {
      rfc: "EKU9003173C9",
      nombre: "ESCUELA KEMPER URGATE",
      domicilioFiscalReceptor: "06600",
      regimenFiscalReceptor: "601",
      usoCfdi: "G03",
    },
    conceptos: [
      {
        claveProdServ: "53131600",
        noIdentificacion: "SKU001",
        cantidad: 2,
        claveUnidad: "H87",
        unidad: "Pieza",
        descripcion: "Sérum Facial Hidratante",
        valorUnitario: 500,
        importe: 1000,
        objetoImp: "02",
        iva: 160,
      },
    ],
  };

  it("informa error controlado si no hay credenciales configuradas", async () => {
    delete process.env.FACTURA_COM_API_KEY;
    delete process.env.FACTURA_COM_SECRET_KEY;
    delete process.env.FACTURACOM_API_KEY;
    delete process.env.FACTURACOM_SECRET_KEY;

    const client = new FacturaComPacClient();
    const result = await client.timbrar(mockPayload);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("MISSING_CREDENTIALS");
    expect(result.errorMessage).toContain("Faltan las credenciales");
  });

  it("procesa respuesta exitosa de Factura.com correctamente", async () => {
    process.env.FACTURA_COM_API_KEY = "test_api_key";
    process.env.FACTURA_COM_SECRET_KEY = "test_secret_key";
    process.env.FACTURA_COM_ENVIRONMENT = "sandbox";

    // Mock global fetch
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/cfdi40/create")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              response: "success",
              message: "Factura creada exitosamente.",
              data: {
                UID: "mock-uid-1234",
                uuid: "3D5A1234-ABCD-4321-9876-FEDCBA987654",
                folio: "101",
                serie: "A",
                fecha: "2026-11-10 12:05:00",
                total: 1160,
                sello: "SELLO_TEST_CFD",
                selloSAT: "SELLO_TEST_SAT",
                noCertificadoSAT: "00001000000504465028",
                cadenaOriginal: "||4.0|3D5A1234-ABCD...||",
              },
            }),
        });
      }
      if (url.includes("/xml")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              response: "success",
              file: Buffer.from("<xml>TEST_XML_CONTENT</xml>").toString("base64"),
            }),
        });
      }
      return Promise.reject(new Error("URL no manejada"));
    });

    global.fetch = mockFetch;

    const client = new FacturaComPacClient();
    const result = await client.timbrar(mockPayload);

    expect(result.success).toBe(true);
    expect(result.uuid).toBe("3D5A1234-ABCD-4321-9876-FEDCBA987654");
    expect(result.noCertificadoSat).toBe("00001000000504465028");
    expect(result.selloCfd).toBe("SELLO_TEST_CFD");
    expect(result.xmlContent).toContain("TEST_XML_CONTENT");
  });
});

