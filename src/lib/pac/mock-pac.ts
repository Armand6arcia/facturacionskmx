import crypto from "crypto";
import {
  PacClient,
  CfdiPayload,
  PacTimbradoResult,
  PacCancelacionResult,
  PacTimbrarOptions,
} from "./pac-interface";

export class MockPacClient implements PacClient {
  private fakeCertificadoSat = "00001000000504465028";
  private fakeCertificadoEmisor = "00001000000506123456";

  async timbrar(payload: CfdiPayload, options?: PacTimbrarOptions): Promise<PacTimbradoResult> {
    // 1. Simulación de falla a petición del usuario para demostrar manejo de reintentos
    if (options?.simularFalla) {
      return {
        success: false,
        errorCode: "PAC_503_SERVICE_UNAVAILABLE",
        errorMessage:
          "Error simulado del PAC: El servicio de timbrado no respondió (HTTP 503). Puedes reintentar sin riesgo de duplicar la factura gracias al control de idempotencia.",
      };
    }

    // 2. Generar UUID falso determinista o aleatorio pero con formato RFC 4122
    const uuid = crypto.randomUUID().toUpperCase();
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "");

    // 3. Generar sellos y cadena original simulada
    const rawCadena = `||4.0|${payload.serie}|${payload.folio}|${payload.fecha}|${payload.formaPago}|${payload.subtotal.toFixed(2)}|${payload.total.toFixed(2)}|${payload.moneda}|${payload.tipoDeComprobante}|${payload.lugarExpedicion}|${payload.emisor.rfc}|${payload.emisor.nombre}|${payload.emisor.regimenFiscal}|${payload.receptor.rfc}|${payload.receptor.nombre}|${payload.receptor.usoCfdi}||`;
    const cadenaOriginal = `||1.1|${uuid}|${now}|DEMO010101000|${rawCadena}||`;

    const selloCfd = Buffer.from(
      crypto.createHash("sha256").update(`CFD-${rawCadena}`).digest("hex")
    ).toString("base64");

    const selloSat = Buffer.from(
      crypto.createHash("sha256").update(`SAT-${cadenaOriginal}`).digest("hex")
    ).toString("base64");

    // 4. Generar XML CFDI 4.0 demostrativo
    const xmlContent = this.generateCfdiXml(payload, {
      uuid,
      fechaTimbrado: now,
      selloCfd,
      selloSat,
      cadenaOriginal,
    });

    return {
      success: true,
      uuid,
      fechaTimbrado: now,
      noCertificadoSat: this.fakeCertificadoSat,
      selloCfd,
      selloSat,
      cadenaOriginal,
      xmlContent,
    };
  }

  async cancelar(
    uuid: string,
    motivo: string,
    folioSustitucion?: string
  ): Promise<PacCancelacionResult> {
    const motivosMap: Record<string, string> = {
      "01": "Comprobante emitido con errores con relación",
      "02": "Comprobante emitido con errores sin relación",
      "03": "No se llevó a cabo la operación",
      "04": "Operación nominativa relacionada en una factura global",
    };

    const descMotivo = motivosMap[motivo] || "Cancelación solicitada por el usuario";

    return {
      success: true,
      codigoEstatus: "201",
      mensaje: `CFDI cancelado exitosamente en ambiente DEMO (Motivo ${motivo}: ${descMotivo}).${
        folioSustitucion ? ` Sustituido por: ${folioSustitucion}` : ""
      }`,
      fechaCancelacion: new Date().toISOString(),
    };
  }

  async obtenerXml(uuid: string): Promise<string> {
    return `<!-- XML CFDI 4.0 DEMO - UUID: ${uuid} - DEMO SIN VALIDEZ FISCAL -->`;
  }

  async obtenerPdf(uuid: string): Promise<string> {
    return `<html><body><h1>CFDI 4.0 DEMO - ${uuid}</h1><p>DEMO – SIN VALIDEZ FISCAL</p></body></html>`;
  }

  private generateCfdiXml(
    payload: CfdiPayload,
    stamp: {
      uuid: string;
      fechaTimbrado: string;
      selloCfd: string;
      selloSat: string;
      cadenaOriginal: string;
    }
  ): string {
    const conceptosXml = payload.conceptos
      .map(
        (c) => `    <cfdi:Concepto ClaveProdServ="${c.claveProdServ}" NoIdentificacion="${c.noIdentificacion}" Cantidad="${c.cantidad}" ClaveUnidad="${c.claveUnidad}" Unidad="Pieza" Descripcion="${this.escapeXml(c.descripcion)}" ValorUnitario="${c.valorUnitario.toFixed(2)}" Importe="${c.importe.toFixed(2)}" ObjetoImp="${c.objetoImp}">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${c.importe.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${c.iva.toFixed(2)}" />
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`
      )
      .join("\n");

    let complementoXml = "";
    if (payload.cartaPorte) {
      const cp = payload.cartaPorte;
      complementoXml = `
  <cfdi:Complemento>
    <cartaporte31:CartaPorte Version="3.1" TranspInternac="${cp.transporteInternacional}" TotalDistRec="${cp.totalDistRec}" PesoBrutoTotal="${cp.pesoBrutoTotal}" NumTotalMercancias="${cp.numTotalMercancias}">
      <cartaporte31:Ubicaciones>
        ${cp.ubicaciones
          .map(
            (u) =>
              `<cartaporte31:Ubicacion TipoUbicacion="${u.tipo}" Domicilio="${this.escapeXml(
                u.domicilio
              )}" ${u.distanciaRecorrida ? `DistanciaRecorrida="${u.distanciaRecorrida}"` : ""}/>`
          )
          .join("\n        ")}
      </cartaporte31:Ubicaciones>
      <cartaporte31:Autotransporte PermSCT="TPXX00" NumPermisoSCT="PERM-DEMO-991">
        <cartaporte31:IdentificacionVehicular ConfigVehicular="${cp.autotransporte.identificacionVehicular.configVehicular}" PlacaVM="${cp.autotransporte.identificacionVehicular.placaVM}" AnioModeloVM="${cp.autotransporte.identificacionVehicular.anioModeloVM}" />
      </cartaporte31:Autotransporte>
      <cartaporte31:FiguraTransporte>
        <cartaporte31:TiposFigura TipoFigura="01" RFCFigura="${cp.operador.rfcOperador}" NombreFigura="${this.escapeXml(
        cp.operador.nombreOperador
      )}" />
      </cartaporte31:FiguraTransporte>
    </cartaporte31:CartaPorte>
  </cfdi:Complemento>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- DEMO – SIN VALIDEZ FISCAL - GENERADO POR FACTURA SKMX -->
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:cartaporte31="http://www.sat.gob.mx/CartaPorte31" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0" Serie="${payload.serie}" Folio="${payload.folio}" Fecha="${payload.fecha}" Sello="${stamp.selloCfd}" FormaPago="${payload.formaPago}" NoCertificado="${this.fakeCertificadoEmisor}" SubTotal="${payload.subtotal.toFixed(2)}" Moneda="${payload.moneda}" Total="${payload.total.toFixed(2)}" TipoDeComprobante="${payload.tipoDeComprobante}" Exportacion="${payload.exportacion}" MetodoPago="${payload.metodoPago}" LugarExpedicion="${payload.lugarExpedicion}">
  <cfdi:Emisor Rfc="${payload.emisor.rfc}" Nombre="${payload.emisor.nombre}" RegimenFiscal="${payload.emisor.regimenFiscal}" />
  <cfdi:Receptor Rfc="${payload.receptor.rfc}" Nombre="${payload.receptor.nombre}" DomicilioFiscalReceptor="${payload.receptor.domicilioFiscalReceptor}" RegimenFiscalReceptor="${payload.receptor.regimenFiscalReceptor}" UsoCFDI="${payload.receptor.usoCfdi}" ${payload.receptor.numRegIdTrib ? `NumRegIdTrib="${payload.receptor.numRegIdTrib}"` : ""} ${payload.receptor.residenciaFiscal ? `ResidenciaFiscal="${payload.receptor.residenciaFiscal}"` : ""}/>
  <cfdi:Conceptos>
${conceptosXml}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${payload.totalIva.toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${payload.subtotal.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${payload.totalIva.toFixed(2)}" />
    </cfdi:Traslados>
  </cfdi:Impuestos>${complementoXml}
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="${stamp.uuid}" FechaTimbrado="${stamp.fechaTimbrado}" RfcProvCertif="DEMO010101000" SelloCFD="${stamp.selloCfd}" NoCertificadoSAT="${this.fakeCertificadoSat}" SelloSAT="${stamp.selloSat}" />
  </cfdi:Complemento>
</cfdi:Comprobante>`;
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}

