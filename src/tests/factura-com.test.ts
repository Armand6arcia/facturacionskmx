import { describe, it, expect, vi, beforeEach } from "vitest";
import { FacturaComPacClient, normalizarNombreCfdi40 } from "../lib/pac/factura-com";
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

    const jsonCreateResp = {
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
    };

    const xmlBase64 = Buffer.from("<xml>TEST_XML_CONTENT</xml>").toString("base64");

    // Mock global fetch
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/clients")) {
        const payload = {
          status: "success",
          data: [{ UID: "mock-client-uid-789", RFC: "EKU9003173C9" }],
        };
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(payload)),
          json: () => Promise.resolve(payload),
        });
      }
      if (url.includes("/series")) {
        const payload = {
          status: "success",
          data: [{ SerieID: 12, SerieName: "A", SerieType: "factura" }],
        };
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(payload)),
          json: () => Promise.resolve(payload),
        });
      }
      if (url.includes("/cfdi40/create")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(jsonCreateResp)),
          json: () => Promise.resolve(jsonCreateResp),
        });
      }
      if (url.includes("/xml")) {
        const payload = {
          response: "success",
          file: xmlBase64,
        };
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(payload)),
          json: () => Promise.resolve(payload),
        });
      }
      return Promise.reject(new Error(`URL no manejada: ${url}`));
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

  it("asigna Unidad: 'Servicio' para conceptos de envío y 'Pieza' para productos", async () => {
    process.env.FACTURA_COM_API_KEY = "test_api_key";
    process.env.FACTURA_COM_SECRET_KEY = "test_secret_key";
    process.env.FACTURA_COM_ENVIRONMENT = "sandbox";

    let capturedBody: any = null;
    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/v1/clients")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ response: "success", data: [] })),
          json: () => Promise.resolve({ response: "success", data: [] }),
        });
      }
      if (url.includes("/v1/series")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ response: "success", data: [] })),
          json: () => Promise.resolve({ response: "success", data: [] }),
        });
      }
      if (url.includes("/cfdi40/create")) {
        capturedBody = JSON.parse(init?.body as string);
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                response: "success",
                data: {
                  UID: "envio-uid-123",
                  uuid: "E48-UUID-1234-ABCD",
                  folio: "102",
                  serie: "F",
                  fecha: "2026-11-10 12:05:00",
                },
              })
            ),
          json: () => Promise.resolve({ response: "success" }),
        });
      }
      if (url.includes("/xml")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve("<cfdi:Comprobante />"),
          json: () => Promise.resolve({ file: "" }),
        });
      }
      return Promise.reject(new Error(`URL: ${url}`));
    });

    global.fetch = mockFetch;

    const payloadConEnvio: CfdiPayload = {
      ...mockPayload,
      conceptos: [
        {
          claveProdServ: "53131613",
          noIdentificacion: "SKU123",
          cantidad: 1,
          claveUnidad: "H87",
          unidad: "Pieza",
          descripcion: "Crema Facial",
          valorUnitario: 300,
          importe: 300,
          objetoImp: "02",
          iva: 48,
        },
        {
          claveProdServ: "78101800",
          noIdentificacion: "880SG00000385",
          cantidad: 1,
          claveUnidad: "E48",
          descripcion: "Servicio de envio",
          valorUnitario: 150,
          importe: 150,
          objetoImp: "02",
          iva: 24,
        },
      ],
    };

    const client = new FacturaComPacClient();
    const result = await client.timbrar(payloadConEnvio);

    expect(result.success).toBe(true);
    expect(capturedBody).not.toBeNull();
    expect(capturedBody.Conceptos).toHaveLength(2);

    // Producto
    expect(capturedBody.Conceptos[0].ClaveUnidad).toBe("H87");
    expect(capturedBody.Conceptos[0].Unidad).toBe("Pieza");

    // Envío
    expect(capturedBody.Conceptos[1].ClaveProdServ).toBe("78101800");
    expect(capturedBody.Conceptos[1].ClaveUnidad).toBe("E48");
    expect(capturedBody.Conceptos[1].Unidad).toBe("Servicio");
  });

  it("incluye nodo InformacionGlobal obligatorio y datos SAT para Factura al Público en General (XAXX010101000)", async () => {
    process.env.FACTURA_COM_API_KEY = "test_api_key";
    process.env.FACTURA_COM_SECRET_KEY = "test_secret_key";
    process.env.FACTURA_COM_SANDBOX = "true";

    let capturedBody: any = null;
    const mockFetch = vi.fn().mockImplementation(async (url: string, init?: any) => {
      if (url.includes("/v4/cfdi40/create")) {
        capturedBody = JSON.parse(init.body);
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              response: "success",
              data: {
                UUID: "CFDI-GLOBAL-UUID-1234-5678",
                FechaTimbrado: "2026-11-13T12:00:00",
              },
            }),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ response: "success", data: [] }),
      };
    });

    global.fetch = mockFetch;

    const payloadGlobal: CfdiPayload = {
      ...mockPayload,
      receptor: {
        rfc: "XAXX010101000",
        nombre: "PUBLICO EN GENERAL",
        domicilioFiscalReceptor: "54090",
        regimenFiscalReceptor: "616",
        usoCfdi: "S01",
      },
      informacionGlobal: {
        periodicidad: "01",
        meses: "11",
        año: 2026,
      },
    };

    const client = new FacturaComPacClient();
    const result = await client.timbrar(payloadGlobal);

    expect(result.success).toBe(true);
    expect(capturedBody).not.toBeNull();
    expect(capturedBody.InformacionGlobal).toBeDefined();
    expect(capturedBody.InformacionGlobal.Periodicidad).toBe("01");
    expect(capturedBody.InformacionGlobal.Meses).toBe("11");
    expect(capturedBody.InformacionGlobal.Año).toBe(2026);

    // Receptor validado para Público en General
    expect(capturedBody.Receptor.Rfc).toBe("XAXX010101000");
    expect(capturedBody.Receptor.Nombre).toBe("PUBLICO EN GENERAL");
    expect(capturedBody.Receptor.RegimenFiscalReceptor).toBe("616");
    expect(capturedBody.Receptor.UsoCFDI).toBe("S01");
    expect(capturedBody.Receptor.DomicilioFiscalReceptor).toBe("06600");
    expect(capturedBody.Receptor.UID).toBeUndefined();
  });

  describe("normalizarNombreCfdi40", () => {
    it("elimina acentos de vocales pero preserva la letra Ñ", () => {
      expect(normalizarNombreCfdi40("JOSÉ MARÍA LÓPEZ HERNÁNDEZ", "LOHJ800101XYZ")).toBe(
        "JOSE MARIA LOPEZ HERNANDEZ"
      );
      expect(normalizarNombreCfdi40("ÁNGEL MUÑOZ PEÑA", "MUPA900202ABC")).toBe(
        "ANGEL MUÑOZ PEÑA"
      );
    });

    it("elimina régimen societario para Personas Morales (RFC 12 caracteres)", () => {
      expect(normalizarNombreCfdi40("STYLE KOREAN MÉXICO S.A. DE C.V.", "SKM220101ABC")).toBe(
        "STYLE KOREAN MEXICO"
      );
    });
  });
});

