export interface PacTimbrarOptions {
  simularFalla?: boolean;
}

export interface PacConcepto {
  claveProdServ: string;
  noIdentificacion: string;
  cantidad: number;
  claveUnidad: string;
  unidad?: string;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  descuento?: number;
  objetoImp: string;
  iva: number;
}

export interface PacEmisor {
  rfc: string;
  nombre: string;
  regimenFiscal: string;
}

export interface PacReceptor {
  uid?: string;
  rfc: string;
  nombre: string;
  domicilioFiscalReceptor: string; // CP
  regimenFiscalReceptor: string;
  usoCfdi: string;
  numRegIdTrib?: string;
  residenciaFiscal?: string;
  pais?: string;
}

export interface CartaPorteUbicacion {
  tipo: "Origen" | "Destino";
  distanciaRecorrida?: number;
  domicilio: string;
}

export interface CartaPorteMercancia {
  bienesTransp: string;
  descripcion: string;
  cantidad: number;
  claveUnidad: string;
  pesoEnKg: number;
}

export interface CartaPorteComplemento {
  transporteInternacional: "No" | "Sí";
  totalDistRec: number;
  ubicaciones: CartaPorteUbicacion[];
  mercancias: CartaPorteMercancia[];
  pesoBrutoTotal: number;
  numTotalMercancias: number;
  autotransporte: {
    permSCT?: string;
    numPermisoSCT?: string;
    identificacionVehicular: {
      configVehicular: string;
      placaVM: string;
      anioModeloVM: number;
    };
  };
  operador: {
    rfcOperador: string;
    nombreOperador: string;
  };
}

export interface CfdiPayload {
  serie: string;
  folio: number | string;
  docNumber?: string;
  numOrder?: string;
  fecha: string; // YYYY-MM-DDTHH:mm:ss
  formaPago: string;
  metodoPago: string;
  moneda: string; // "MXN"
  tipoDeComprobante: "I" | "E" | "T"; // I: Ingreso, T: Traslado
  exportacion: "01" | "02" | "03" | "04";
  lugarExpedicion: string; // CP
  subtotal: number;
  descuento?: number;
  total: number;
  emisor: PacEmisor;
  receptor: PacReceptor;
  conceptos: PacConcepto[];
  totalIva: number;
  cartaPorte?: CartaPorteComplemento;
  informacionGlobal?: {
    periodicidad: string;
    meses: string;
    año: number;
  };
}

export interface PacTimbradoResult {
  success: boolean;
  uuid?: string;
  pacUid?: string; // Identificador interno del CFDI en el PAC (ej. UID de Factura.com)
  serie?: string; // Serie asignada por el PAC
  folio?: string; // Folio asignado por el PAC
  fechaTimbrado?: string;
  noCertificadoSat?: string;
  selloCfd?: string;
  selloSat?: string;
  cadenaOriginal?: string;
  xmlContent?: string;
  errorMessage?: string;
  errorCode?: string;
  idempotente?: boolean;
}

export interface PacCancelacionResult {
  success: boolean;
  mensaje: string;
  codigoEstatus?: string;
  fechaCancelacion?: string;
}

export interface PacClient {
  timbrar(payload: CfdiPayload, options?: PacTimbrarOptions): Promise<PacTimbradoResult>;
  cancelar(uuid: string, motivo: string, folioSustitucion?: string): Promise<PacCancelacionResult>;
  obtenerXml(uuid: string): Promise<string>;
  obtenerPdf(uuid: string): Promise<string>; // HTML/Base64 representable
  obtenerClientes?(): Promise<any[]>;
}

