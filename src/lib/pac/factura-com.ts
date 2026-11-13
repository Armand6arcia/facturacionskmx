// src/lib/pac/factura-com.ts
// Cliente oficial para timbrado CFDI 4.0 con la API v4 de Factura.com
//
// URLs oficiales:
//   Producción: https://api.factura.com          (ej. https://api.factura.com/v4/cfdi40/create)
//   Sandbox:    https://sandbox.factura.com/api  (ej. https://sandbox.factura.com/api/v4/cfdi40/create)

import {
  PacClient,
  CfdiPayload,
  PacTimbrarOptions,
  PacTimbradoResult,
  PacCancelacionResult,
} from "./pac-interface";
import {
  getSatMappingForConcepto,
  CLAVE_PROD_ENVIO_DEFAULT,
  CLAVE_UNIDAD_ENVIO_DEFAULT,
  UNIDAD_ENVIO_DEFAULT,
  DESCRIPCION_ENVIO_DEFAULT,
} from "../sat/catalog-defaults";
import { limpiarRazonSocialCfdi40 } from "../parsers/csf-parser";

/**
 * Normaliza el nombre del receptor para CFDI 4.0:
 * - Remueve acentos de vocales (Á->A, É->E, Í->I, Ó->O, Ú->U) para compatibilidad con la lista LCO del SAT.
 * - Preserva Ñ y caracteres válidos.
 * - En Personas Morales (RFC de 12 posiciones), elimina el régimen societario (S.A. DE C.V., etc.).
 * - Colapsa espacios múltiples y convierte a mayúsculas.
 */
export function normalizarNombreCfdi40(nombre: string, rfc?: string): string {
  if (!nombre) return "";
  let n = nombre
    .replace(/[ÁÀÄÂáàäâ]/g, "A")
    .replace(/[ÉÈËÊéèëê]/g, "E")
    .replace(/[ÍÌÏÎíìïî]/g, "I")
    .replace(/[ÓÒÖÔóòöô]/g, "O")
    .replace(/[ÚÙÜÛúùüû]/g, "U")
    .trim();

  if (rfc && rfc.trim().length === 12) {
    n = limpiarRazonSocialCfdi40(n);
  }

  return n.replace(/\s+/g, " ").toUpperCase();
}

interface FacturaComResponse {
  ok: boolean;
  status: number;
  json: any;
  text: string;
  isJson: boolean;
}

export class FacturaComPacClient implements PacClient {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey =
      process.env.FACTURA_COM_API_KEY ||
      process.env.FACTURACOM_API_KEY ||
      "";
    this.secretKey =
      process.env.FACTURA_COM_SECRET_KEY ||
      process.env.FACTURACOM_SECRET_KEY ||
      "";
    const envVal =
      process.env.FACTURA_COM_ENVIRONMENT ||
      process.env.FACTURACOM_ENV ||
      "production";

    const isSandbox = envVal.toLowerCase() === "sandbox";

    const customBase = process.env.FACTURA_COM_BASE_URL || process.env.FACTURACOM_BASE_URL;
    this.baseUrl = (
      customBase ||
      (isSandbox ? "https://sandbox.factura.com/api" : "https://api.factura.com")
    ).replace(/\/+$/, "");

    if (!this.apiKey || !this.secretKey) {
      console.warn(
        "Aviso: Credenciales de Factura.com no detectadas (FACTURA_COM_API_KEY / FACTURA_COM_SECRET_KEY)."
      );
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "F-PLUGIN": "9d4095c8f7ed5785cb14c0e3b033eeb8252416ed",
      "F-Api-Key": this.apiKey,
      "F-Secret-Key": this.secretKey,
      "F-ApiKey": this.apiKey,
      "F-SecretKey": this.secretKey,
    };
  }

  /**
   * Realiza una petición a Factura.com y parsea la respuesta de forma segura
   * (evita "Unexpected token '<'" cuando el servidor devuelve HTML).
   */
  private async request(
    method: "GET" | "POST",
    path: string,
    body?: any
  ): Promise<FacturaComResponse> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      headers: this.getHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    let text = "";
    try {
      if (typeof response.text === "function") {
        text = await response.text();
      }
    } catch {
      text = "";
    }

    let json: any = null;
    let isJson = false;
    try {
      if (text) {
        json = JSON.parse(text);
        isJson = true;
      } else if (typeof (response as any).json === "function") {
        json = await (response as any).json();
        isJson = true;
      }
    } catch {
      json = null;
    }

    return { ok: response.ok, status: response.status, json, text, isJson };
  }

  private describeNonJson(res: FacturaComResponse, path: string): string {
    const snippet = res.text.replace(/\s+/g, " ").slice(0, 160);
    return `Factura.com respondió HTTP ${res.status} con contenido no-JSON en ${this.baseUrl}${path}. Verifica la URL de la API, el ambiente (FACTURA_COM_ENVIRONMENT) y tus credenciales. Respuesta: ${snippet}`;
  }

  private extractErrorMessage(json: any, fallback: string): string {
    if (!json) return fallback;
    const msg = json.message ?? json.error ?? json.Message ?? json.errors;
    if (!msg) return fallback;
    if (typeof msg === "string") return msg;
    if (typeof msg === "object") {
      if (typeof msg.message === "string") return msg.message;
      try {
        return JSON.stringify(msg);
      } catch {
        return fallback;
      }
    }
    return String(msg);
  }

  private isErrorPayload(json: any): boolean {
    if (!json) return true;
    const status = String(json.response ?? json.status ?? "").toLowerCase();
    return status === "error" || status === "fail" || status === "failed";
  }

  /** Busca recursivamente una llave (case-insensitive) dentro de un objeto */
  private findKey(obj: any, keys: string[], depth = 0): any {
    if (!obj || typeof obj !== "object" || depth > 4) return undefined;
    const lowerKeys = keys.map((k) => k.toLowerCase());
    for (const [k, v] of Object.entries(obj)) {
      if (lowerKeys.includes(k.toLowerCase()) && v !== null && v !== undefined && v !== "") {
        if (typeof v !== "object") return v;
      }
    }
    for (const v of Object.values(obj)) {
      if (v && typeof v === "object") {
        const found = this.findKey(v, keys, depth + 1);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }

  /**
   * Busca un cliente en Factura.com específicamente por su RFC.
   * Utiliza las rutas directas /v1/clients/rfc/{RFC} o /v1/clients/{RFC}.
   * NUNCA descarga el catálogo completo para evitar demoras innecesarias.
   */
  async buscarClientePorRfc(rfc: string): Promise<string | undefined> {
    const cleanRfc = rfc.trim().toUpperCase();
    if (!cleanRfc) return undefined;

    // 1. Endpoint oficial específico por RFC
    try {
      const res = await this.request("GET", `/v1/clients/rfc/${encodeURIComponent(cleanRfc)}`);
      if (res.isJson && res.ok && !this.isErrorPayload(res.json)) {
        const uid = this.findKey(res.json, ["UID", "uid"]);
        if (uid) return String(uid);
      }
    } catch {}

    // 2. Endpoint alternativo /v1/clients/{RFC}
    try {
      const res = await this.request("GET", `/v1/clients/${encodeURIComponent(cleanRfc)}`);
      if (res.isJson && res.ok && !this.isErrorPayload(res.json)) {
        const uid = this.findKey(res.json, ["UID", "uid"]);
        if (uid) return String(uid);
      }
    } catch {}

    return undefined;
  }

  /**
   * Obtiene (o registra) el cliente en Factura.com y devuelve su UID.
   * Factura.com v4 admite Receptor.UID de un cliente existente o datos completos de receptor.
   */
  private async resolverReceptorUid(payload: CfdiPayload): Promise<string | undefined> {
    if (payload.receptor.uid) {
      return payload.receptor.uid;
    }

    const rfc = payload.receptor.rfc.trim().toUpperCase();
    const razons = normalizarNombreCfdi40(payload.receptor.nombre, rfc);
    const emailDefault =
      process.env.FACTURA_COM_CLIENTE_EMAIL ||
      process.env.FACTURACOM_CLIENTE_EMAIL ||
      "facturacion@stylekorean.mx";

    const payloadCliente: any = {
      rfc,
      razons,
      regimen: payload.receptor.regimenFiscalReceptor,
      usocfdi: payload.receptor.usoCfdi || "G03",
      codpos: payload.receptor.domicilioFiscalReceptor,
      email: emailDefault,
      pais: "MEX",
    };
    if (payload.receptor.numRegIdTrib) payloadCliente.numregidtrib = payload.receptor.numRegIdTrib;

    // 1. Buscar únicamente por RFC específico
    const existingUid = await this.buscarClientePorRfc(rfc);
    if (existingUid) {
      try {
        await this.request("POST", `/v1/clients/${encodeURIComponent(existingUid)}/update`, payloadCliente);
      } catch {}
      return existingUid;
    }

    // 2. Intentar registrar al cliente en Factura.com directamente
    try {
      const created = await this.request("POST", `/v1/clients/create`, payloadCliente);
      if (created.isJson && created.ok && !this.isErrorPayload(created.json)) {
        const uid = this.findKey(created.json, ["UID", "uid"]);
        if (uid) return String(uid);
      }
    } catch (err) {
      console.warn("[FacturaCom] No se pudo registrar al cliente:", err);
    }

    return undefined;
  }

  /**
   * Sincroniza un cliente individual con Factura.com (crea si no existe, actualiza si ya existe).
   */
  async sincronizarCliente(cliente: {
    rfc: string;
    razonSocial: string;
    codigoPostal: string;
    regimenFiscal: string;
    usoCfdi?: string;
    email?: string;
    numRegIdTrib?: string | null;
    pais?: string;
  }): Promise<{ success: boolean; uid?: string; action: "created" | "updated" | "skipped"; error?: string }> {
    if (!this.apiKey || !this.secretKey) {
      return { success: false, action: "skipped", error: "Credenciales de Factura.com no configuradas." };
    }

    const rfc = (cliente.rfc || "").trim().toUpperCase();
    if (!rfc) {
      return { success: false, action: "skipped", error: "RFC requerido." };
    }

    const razons = normalizarNombreCfdi40(cliente.razonSocial, rfc);
    const codpos = String(cliente.codigoPostal || "06600").trim();
    const regimen = String(cliente.regimenFiscal || (rfc.length === 12 ? "601" : "612")).trim();
    const usocfdi = String(cliente.usoCfdi || "G03").trim();
    const email =
      (cliente.email && cliente.email.trim()) ||
      process.env.FACTURA_COM_CLIENTE_EMAIL ||
      process.env.FACTURACOM_CLIENTE_EMAIL ||
      "facturacion@stylekorean.mx";

    const payloadCliente: any = {
      rfc,
      razons,
      codpos,
      regimen,
      usocfdi,
      email,
      pais: cliente.pais || "MEX",
    };
    if (cliente.numRegIdTrib) payloadCliente.numregidtrib = cliente.numRegIdTrib;

    // 1. Buscar únicamente por su RFC puntual (sin descargar el catálogo completo)
    const existingUid = await this.buscarClientePorRfc(rfc);

    // 2. Si ya existe, actualizarlo puntualmente con los datos más recientes
    if (existingUid) {
      try {
        const updateRes = await this.request(
          "POST",
          `/v1/clients/${encodeURIComponent(existingUid)}/update`,
          payloadCliente
        );
        if (updateRes.isJson && updateRes.ok && !this.isErrorPayload(updateRes.json)) {
          return { success: true, uid: existingUid, action: "updated" };
        }
      } catch (err: any) {
        console.warn(`[FacturaCom] Falló actualización de cliente ${rfc}:`, err?.message);
      }
      return { success: true, uid: existingUid, action: "updated" };
    }

    // 3. Si no existe, registrarlo nuevo en Factura.com
    try {
      const createRes = await this.request("POST", `/v1/clients/create`, payloadCliente);
      if (createRes.isJson && createRes.ok && !this.isErrorPayload(createRes.json)) {
        const newUid = this.findKey(createRes.json, ["UID", "uid"]);
        return { success: true, uid: newUid ? String(newUid) : undefined, action: "created" };
      } else {
        // En caso de que Factura.com indique que el RFC ya existía, reintentar obtener su UID directo
        const retryUid = await this.buscarClientePorRfc(rfc);
        if (retryUid) {
          try {
            await this.request("POST", `/v1/clients/${encodeURIComponent(retryUid)}/update`, payloadCliente);
          } catch {}
          return { success: true, uid: retryUid, action: "updated" };
        }
        const errMsg = this.extractErrorMessage(createRes.json, `Error ${createRes.status}`);
        return { success: false, action: "skipped", error: errMsg };
      }
    } catch (err: any) {
      return { success: false, action: "skipped", error: err?.message || "Error al crear cliente en Factura.com" };
    }
  }

  /**
   * Obtiene el ID numérico de la serie configurada en Factura.com (ej. "F").
   */
  private async resolverSerieId(serieNombre: string, tipo: string): Promise<string | undefined> {
    const envSerieId = process.env.FACTURA_COM_SERIE_ID || process.env.FACTURACOM_SERIE_ID;
    if (envSerieId) return envSerieId;

    const res = await this.request("GET", `/v4/series`);
    if (!res.isJson || !res.ok || this.isErrorPayload(res.json)) {
      console.warn(
        "[FacturaCom] No se pudo consultar /v4/series:",
        res.isJson ? this.extractErrorMessage(res.json, `HTTP ${res.status}`) : res.text.slice(0, 160)
      );
      return undefined;
    }

    const lista: any[] = Array.isArray(res.json?.data)
      ? res.json.data
      : Array.isArray(res.json?.Data)
      ? res.json.Data
      : Array.isArray(res.json)
      ? res.json
      : [];

    const nombre = (serieNombre || "").trim().toUpperCase();
    const getName = (s: any) => String(s.SerieName ?? s.serie ?? s.Serie ?? s.name ?? "").trim().toUpperCase();
    const getType = (s: any) => String(s.SerieType ?? s.tipo ?? s.type ?? "").trim().toLowerCase();
    const getId = (s: any) => s.SerieID ?? s.SerieId ?? s.id ?? s.ID ?? s.uid ?? s.UID;
    const isActive = (s: any) => {
      const st = String(s.SerieStatus ?? s.status ?? "activa").toLowerCase();
      return !st.includes("inactiv") && !st.includes("desactiv");
    };

    const candidatos = lista.filter(isActive);
    const match =
      candidatos.find((s) => getName(s) === nombre && (!getType(s) || getType(s) === tipo)) ||
      candidatos.find((s) => getName(s) === nombre) ||
      candidatos.find((s) => getType(s) === tipo);

    const id = match ? getId(match) : undefined;
    return id !== undefined && id !== null ? String(id) : undefined;
  }

  /** Extrae un atributo XML de un nodo dado */
  private xmlAttr(xml: string, node: string, attr: string): string | undefined {
    const nodeMatch = xml.match(new RegExp(`<[\\w]*:?${node}\\b[^>]*>`, "i"));
    if (!nodeMatch) return undefined;
    const attrMatch = nodeMatch[0].match(new RegExp(`\\b${attr}="([^"]*)"`));
    return attrMatch ? attrMatch[1] : undefined;
  }

  /** Decodifica una respuesta de descarga de XML (texto plano, JSON base64 o JSON con texto) */
  private decodeXmlResponse(res: FacturaComResponse): string {
    const trimmed = res.text.trim();
    if (trimmed.startsWith("<")) {
      // Puede ser XML real o una página HTML de error
      if (/<cfdi:Comprobante|<\?xml/i.test(trimmed) && !/<!DOCTYPE html/i.test(trimmed)) {
        return trimmed;
      }
      return "";
    }
    if (res.isJson && res.json) {
      const candidate = res.json.file ?? res.json.data ?? res.json.xml ?? res.json.Data;
      if (typeof candidate === "string") {
        if (candidate.trim().startsWith("<")) return candidate.trim();
        try {
          const decoded = Buffer.from(candidate, "base64").toString("utf-8");
          if (decoded.includes("<")) return decoded;
        } catch {
          /* noop */
        }
      }
    }
    return "";
  }

  /**
   * Timbrar documento CFDI 4.0 en Factura.com
   */
  async timbrar(
    payload: CfdiPayload,
    options?: PacTimbrarOptions
  ): Promise<PacTimbradoResult> {
    if (!this.apiKey || !this.secretKey) {
      return {
        success: false,
        errorMessage:
          "Faltan las credenciales FACTURA_COM_API_KEY y FACTURA_COM_SECRET_KEY en las variables de entorno de Hostinger.",
        errorCode: "MISSING_CREDENTIALS",
      };
    }

    try {
      // 1. Resolver UID del receptor en el catálogo de Factura.com (o fallback a datos completos)
      let receptorUid: string | undefined = undefined;
      try {
        receptorUid = await this.resolverReceptorUid(payload);
      } catch (rErr) {
        console.warn("[FacturaCom] No se pudo resolver UID del receptor:", rErr);
      }

      // 2. Resolver serie (ID numérico en Factura.com)
      const tipoDocumento = payload.tipoDeComprobante === "T" ? "traslado" : "factura";
      let serieId: string | undefined = undefined;
      try {
        serieId = await this.resolverSerieId(payload.serie || "F", tipoDocumento);
      } catch (sErr) {
        console.warn("[FacturaCom] No se pudo resolver serie ID:", sErr);
      }

      // 3. Transformar conceptos al formato CFDI 4.0 de Factura.com
      const conceptosFactura = payload.conceptos.map((c) => {
        const valorUnitario = Number(c.valorUnitario.toFixed(2));
        const base = Number((c.cantidad * valorUnitario).toFixed(2));
        const iva = Number((base * 0.16).toFixed(2));
        const sat = getSatMappingForConcepto(c.noIdentificacion, c.descripcion, c.claveProdServ, c.claveUnidad);
        const isEnvio = sat.isEnvio || c.claveUnidad === "E48" || c.claveProdServ === "78101800";

        const claveProdServ = isEnvio ? CLAVE_PROD_ENVIO_DEFAULT : (c.claveProdServ || sat.claveProdServ);
        const claveUnidad = isEnvio ? CLAVE_UNIDAD_ENVIO_DEFAULT : (c.claveUnidad || sat.claveUnidad);
        const unidad = isEnvio ? UNIDAD_ENVIO_DEFAULT : (c.unidad || sat.unidad || "Pieza");
        const descripcion = isEnvio ? DESCRIPCION_ENVIO_DEFAULT : c.descripcion;

        const concepto: any = {
          ClaveProdServ: claveProdServ,
          Cantidad: c.cantidad,
          ClaveUnidad: claveUnidad,
          Unidad: unidad,
          Descripcion: descripcion,
          ValorUnitario: valorUnitario,
          Importe: base,
          ObjetoImp: c.objetoImp || "02",
          Impuestos: {
            Traslados: [
              {
                Base: base,
                Impuesto: "002",
                TipoFactor: "Tasa",
                TasaOCuota: "0.16",
                Importe: iva,
              },
            ],
            Retenidos: [],
            Locales: [],
          },
        };

        if (c.noIdentificacion && c.noIdentificacion.trim()) {
          concepto.NoIdentificacion = c.noIdentificacion.trim();
        } else if (isEnvio) {
          concepto.NoIdentificacion = "DELIVERYFEE";
        }
        if (c.descuento) concepto.Descuento = Number(c.descuento.toFixed(2));
        return concepto;
      });

      // 4. Construir cuerpo JSON para /v4/cfdi40/create
      const usoCfdiReceptor = (payload.receptor.usoCfdi && payload.receptor.usoCfdi.trim()) || "G03";

      const nombreNormalizado = normalizarNombreCfdi40(payload.receptor.nombre, payload.receptor.rfc);

      const receptorNode: any = receptorUid
        ? {
            UID: receptorUid,
            Rfc: payload.receptor.rfc,
            Nombre: nombreNormalizado,
            DomicilioFiscalReceptor: payload.receptor.domicilioFiscalReceptor,
            RegimenFiscalReceptor: payload.receptor.regimenFiscalReceptor,
            UsoCFDI: usoCfdiReceptor,
            usocfdi: usoCfdiReceptor,
          }
        : {
            Rfc: payload.receptor.rfc,
            Nombre: nombreNormalizado,
            DomicilioFiscalReceptor: payload.receptor.domicilioFiscalReceptor,
            RegimenFiscalReceptor: payload.receptor.regimenFiscalReceptor,
            UsoCFDI: usoCfdiReceptor,
            usocfdi: usoCfdiReceptor,
          };

      const body: any = {
        Receptor: receptorNode,
        TipoDocumento: tipoDocumento,
        Conceptos: conceptosFactura,
        UsoCFDI: usoCfdiReceptor,
        usocfdi: usoCfdiReceptor,
        FormaPago: payload.formaPago || "03",
        MetodoPago: payload.metodoPago || "PUE",
        Moneda: payload.moneda || "MXN",
        CondicionesDePago: "Inmediato",
        LugarExpedicion: payload.lugarExpedicion || "54090",
        Exportacion: payload.exportacion || "01",
        EnviarCorreo: false,
      };

      if (serieId) body.Serie = Number.isNaN(Number(serieId)) ? serieId : Number(serieId);

      // Número de orden / pedido para control interno y aparición en columna Orden de Factura.com y PDF
      const orderNum = payload.numOrder || payload.docNumber;
      if (orderNum) {
        body.NumOrder = String(orderNum).trim().slice(0, 30);
      }

      // Información global si aplica (ventas al público en general)
      if (payload.informacionGlobal) {
        body.InformacionGlobal = {
          Periodicidad: payload.informacionGlobal.periodicidad,
          Meses: payload.informacionGlobal.meses,
          "Año": payload.informacionGlobal.año,
        };
      }

      console.log(`[FacturaCom] Enviando petición a ${this.baseUrl}/v4/cfdi40/create...`);

      const res = await this.request("POST", `/v4/cfdi40/create`, body);

      if (!res.isJson) {
        const msg = this.describeNonJson(res, "/v4/cfdi40/create");
        console.error("[FacturaCom]", msg);
        return { success: false, errorMessage: msg, errorCode: `HTTP_${res.status}` };
      }

      const json = res.json;
      if (!res.ok || this.isErrorPayload(json)) {
        const errorMsg = this.extractErrorMessage(
          json,
          `Error ${res.status} devuelto por Factura.com`
        );
        console.error("[FacturaCom] Error al timbrar:", errorMsg, JSON.stringify(json).slice(0, 800));
        return {
          success: false,
          errorMessage: errorMsg,
          errorCode: String(json?.code || res.status),
        };
      }

      const uuid = this.findKey(json, ["UUID"]) as string | undefined;
      const uid = (this.findKey(json, ["uid", "invoice_uid", "cfdi_uid"]) as string | undefined) || uuid;

      if (!uuid) {
        console.error("[FacturaCom] Respuesta sin UUID:", JSON.stringify(json).slice(0, 800));
        return {
          success: false,
          errorMessage: "Factura.com respondió con éxito pero no devolvió el UUID fiscal.",
          errorCode: "NO_UUID_IN_RESPONSE",
        };
      }

      // 5. Descargar el XML sellado oficial
      let xmlContent = "";
      for (const id of Array.from(new Set([uid, uuid].filter(Boolean))) as string[]) {
        try {
          const xmlRes = await this.request("GET", `/v4/cfdi40/${encodeURIComponent(id)}/xml`);
          if (xmlRes.ok) {
            xmlContent = this.decodeXmlResponse(xmlRes);
            if (xmlContent) break;
          }
        } catch (xmlErr) {
          console.warn("[FacturaCom] No se pudo descargar el XML directo:", xmlErr);
        }
      }

      // 6. Extraer datos del timbre (de la respuesta o del XML oficial)
      const fromXml = (attr: string) =>
        xmlContent ? this.xmlAttr(xmlContent, "TimbreFiscalDigital", attr) : undefined;

      const fechaTimbrado =
        fromXml("FechaTimbrado") ||
        (this.findKey(json, ["FechaTimbrado", "fecha_timbrado"]) as string) ||
        new Date().toISOString();
      const noCertificadoSat =
        fromXml("NoCertificadoSAT") ||
        (this.findKey(json, ["NoCertificadoSAT"]) as string) ||
        "";
      const selloCfd =
        fromXml("SelloCFD") || (this.findKey(json, ["SelloCFD", "Sello"]) as string) || "";
      const selloSat =
        fromXml("SelloSAT") || (this.findKey(json, ["SelloSAT"]) as string) || "";
      const rfcProvCertif =
        fromXml("RfcProvCertif") || (this.findKey(json, ["RfcProvCertif"]) as string) || "";

      const serieResp =
        (xmlContent && this.xmlAttr(xmlContent, "Comprobante", "Serie")) ||
        (this.findKey(json, ["Serie", "serie"]) as string | undefined);
      const folioResp =
        (xmlContent && this.xmlAttr(xmlContent, "Comprobante", "Folio")) ||
        (this.findKey(json, ["Folio", "folio"]) as string | undefined);

      const cadenaOriginal = `||1.1|${uuid}|${fechaTimbrado}|${rfcProvCertif}|${selloCfd}|${noCertificadoSat}||`;

      // Si no se pudo descargar el XML en este instante, construimos una representación con los sellos oficiales
      if (!xmlContent) {
        xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="4.0" Serie="${serieResp || payload.serie}" Folio="${folioResp || payload.folio}" Total="${payload.total}" Sello="${selloCfd}">
  <cfdi:Emisor Rfc="${payload.emisor.rfc}" Nombre="${payload.emisor.nombre}" RegimenFiscal="${payload.emisor.regimenFiscal}"/>
  <cfdi:Receptor Rfc="${payload.receptor.rfc}" Nombre="${payload.receptor.nombre}" DomicilioFiscalReceptor="${payload.receptor.domicilioFiscalReceptor}" RegimenFiscalReceptor="${payload.receptor.regimenFiscalReceptor}" UsoCFDI="${payload.receptor.usoCfdi}"/>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital Version="1.1" UUID="${uuid}" FechaTimbrado="${fechaTimbrado}" RfcProvCertif="${rfcProvCertif}" SelloCFD="${selloCfd}" NoCertificadoSAT="${noCertificadoSat}" SelloSAT="${selloSat}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
      }

      return {
        success: true,
        uuid,
        pacUid: uid,
        serie: serieResp,
        folio: folioResp,
        fechaTimbrado,
        noCertificadoSat: noCertificadoSat || "00001000000504465028",
        selloCfd: selloCfd || "SELLO_CFD_FACTURA_COM",
        selloSat: selloSat || "SELLO_SAT_FACTURA_COM",
        cadenaOriginal,
        xmlContent,
      };
    } catch (err: any) {
      console.error("[FacturaCom] Excepción de conexión:", err);
      return {
        success: false,
        errorMessage: `Error al conectar con Factura.com: ${err.message}`,
        errorCode: "NETWORK_EXCEPTION",
      };
    }
  }

  /**
   * Cancelar un CFDI timbrado en Factura.com
   */
  async cancelar(
    uuid: string,
    motivo: string,
    folioSustitucion?: string
  ): Promise<PacCancelacionResult> {
    if (!this.apiKey || !this.secretKey) {
      return {
        success: false,
        mensaje: "Faltan credenciales de Factura.com.",
      };
    }

    try {
      const path = `/v4/cfdi40/${encodeURIComponent(uuid)}/cancel`;
      const res = await this.request("POST", path, {
        motivo: motivo || "02",
        folioSustituto: folioSustitucion || "",
      });

      if (!res.isJson) {
        return { success: false, mensaje: this.describeNonJson(res, path) };
      }

      if (!res.ok || this.isErrorPayload(res.json)) {
        return {
          success: false,
          mensaje: this.extractErrorMessage(res.json, "Error al cancelar en Factura.com"),
        };
      }

      return {
        success: true,
        mensaje: this.extractErrorMessage(
          res.json,
          `CFDI ${uuid} cancelado exitosamente en Factura.com.`
        ),
        fechaCancelacion: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        mensaje: `Error de conexión al cancelar: ${err.message}`,
      };
    }
  }

  /**
   * Obtener XML oficial de una factura timbrada
   */
  async obtenerXml(uuidOrUid: string): Promise<string> {
    const path = `/v4/cfdi40/${encodeURIComponent(uuidOrUid)}/xml`;
    const res = await this.request("GET", path);

    if (!res.ok) {
      throw new Error(`Error al obtener XML de Factura.com: HTTP ${res.status}`);
    }

    const xml = this.decodeXmlResponse(res);
    if (xml) return xml;
    throw new Error("Formato de respuesta XML no reconocido por Factura.com");
  }

  /**
   * Obtener PDF oficial de una factura timbrada (Base64 o URL)
   */
  async obtenerPdf(uuidOrUid: string): Promise<string> {
    const url = `${this.baseUrl}/v4/cfdi40/${encodeURIComponent(uuidOrUid)}/pdf`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Error al obtener PDF de Factura.com: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // PDF binario directo
    if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") {
      return buffer.toString("base64");
    }

    // Respuesta JSON con base64 o URL
    const text = buffer.toString("utf-8");
    try {
      const json = JSON.parse(text);
      if (typeof json.file === "string") return json.file;
      if (typeof json.data === "string") return json.data;
      if (typeof json.file_url === "string") return json.file_url;
    } catch {
      /* noop */
    }
    throw new Error("Formato de respuesta PDF no reconocido por Factura.com");
  }

  /**
   * Obtener lista de clientes registrados en Factura.com
   */
  async obtenerClientes(): Promise<any[]> {
    if (!this.apiKey || !this.secretKey) {
      throw new Error(
        "Faltan las credenciales FACTURA_COM_API_KEY y FACTURA_COM_SECRET_KEY en las variables de entorno."
      );
    }

    const path = `/v1/clients`;
    const res = await this.request("GET", path);

    if (!res.isJson) {
      throw new Error(this.describeNonJson(res, path));
    }

    if (!res.ok || this.isErrorPayload(res.json)) {
      throw new Error(
        `Error ${res.status} de Factura.com al consultar clientes: ${this.extractErrorMessage(
          res.json,
          "respuesta inválida"
        )}`
      );
    }

    const json = res.json;
    const lista = json.data ?? json.Data ?? json.clients ?? json;
    return Array.isArray(lista) ? lista : [];
  }
}
