export type AlertSeverity = "RED" | "YELLOW";

export interface DocumentAlert {
  id: string;
  severity: AlertSeverity;
  titulo: string;
  mensaje: string;
  campoRelacionado?: string;
  skuRelacionado?: string;
  accionSugerida?: string;
  bloqueaTimbrado: boolean;
  resuelto?: boolean;
}

export interface CheckAlertsInput {
  docNumber: string;
  fileHash: string;
  tipoFactura: string;
  fechaEmision: Date | string;
  cliente?: {
    rfc?: string;
    razonSocial?: string;
    codigoPostal?: string;
    regimenFiscal?: string;
    usoCfdi?: string;
    pais?: string;
  } | null;
  items: Array<{
    sku: string;
    descripcion: string;
    cantidad: number;
    piQty?: number | null;
    precioUnitario: number;
    claveProdServ?: string | null;
    purposeOfUse?: string | null;
    reference?: string | null;
    piNo?: string | null;
    excluido?: boolean;
    descuentoCien?: boolean;
  }>;
  subtotalCalculado: number;
  totalCalculado: number;
  totalArchivo?: number | null;
  documentoYaTimbrado?: boolean;
  fechaEsAmbigua?: boolean;
}

export function checkDocumentAlerts(input: CheckAlertsInput): DocumentAlert[] {
  const alerts: DocumentAlert[] = [];

  // ==================== ALERTAS ROJAS (BLOQUEANTES) ====================

  // 1. Documento ya timbrado (por docNumber o hash)
  if (input.documentoYaTimbrado) {
    alerts.push({
      id: "DOC_ALREADY_STAMPED",
      severity: "RED",
      titulo: "Documento ya timbrado previamente",
      mensaje: `El documento ${input.docNumber} (o con este mismo contenido) ya fue timbrado en el sistema. Se previene timbrado duplicado.`,
      bloqueaTimbrado: true,
      accionSugerida: "Consulta la factura previa en el Historial.",
    });
  }

  // 2. SKUs sin mapear en catálogo SAT
  const unmappedItems = input.items.filter((it) => !it.excluido && (!it.claveProdServ || it.claveProdServ.trim() === ""));
  if (unmappedItems.length > 0) {
    const uniqueSkus = Array.from(new Set(unmappedItems.map((i) => i.sku)));
    alerts.push({
      id: "UNMAPPED_SKUS",
      severity: "RED",
      titulo: `${uniqueSkus.length} producto(s) nuevo(s) sin clave SAT`,
      mensaje: `Los siguientes SKUs no tienen asignada una Clave de Producto o Servicio del SAT: ${uniqueSkus.join(", ")}.`,
      bloqueaTimbrado: true,
      accionSugerida: "Usa el botón 'Resolver productos' para asignar y guardar la clave SAT demo de forma permanente.",
    });
  }

  // 3. Cliente sin seleccionar o datos fiscales incompletos
  if (input.tipoFactura === "CLIENTE") {
    if (!input.cliente || !input.cliente.rfc) {
      alerts.push({
        id: "CLIENT_MISSING",
        severity: "RED",
        titulo: "Cliente no seleccionado",
        mensaje: "Debes seleccionar un cliente de la base de datos o registrar uno nuevo para facturación específica.",
        bloqueaTimbrado: true,
        accionSugerida: "Selecciona un cliente en la sección de datos del receptor.",
      });
    } else {
      const c = input.cliente;
      if (!c.razonSocial || !c.codigoPostal || !c.regimenFiscal || !c.usoCfdi) {
        alerts.push({
          id: "CLIENT_INCOMPLETE",
          severity: "RED",
          titulo: "Datos fiscales del cliente incompletos",
          mensaje: "El receptor debe contar con RFC, Razón Social, C.P., Régimen Fiscal y Uso de CFDI válidos para CFDI 4.0.",
          bloqueaTimbrado: true,
          accionSugerida: "Completa los campos fiscales del receptor.",
        });
      }
    }
  }

  // 4. Totales que no cuadran con el archivo (tolerancia > 0.05 MXN)
  if (input.totalArchivo && input.totalArchivo > 0) {
    const diff = Math.abs(input.totalCalculado - input.totalArchivo);
    if (diff > 0.05) {
      alerts.push({
        id: "TOTALS_MISMATCH",
        severity: "RED",
        titulo: "Diferencia de totales superior a la tolerancia ($0.05 MXN)",
        mensaje: `El total calculado ($${input.totalCalculado.toFixed(2)}) difiere del total en el archivo ($${input.totalArchivo.toFixed(2)}) por $${diff.toFixed(2)} MXN.`,
        bloqueaTimbrado: true,
        accionSugerida: "Revisa las cantidades y precios unitarios en la tabla de partidas.",
      });
    }
  }

  // ==================== ALERTAS AMARILLAS (CONFIRMABLES) ====================

  // 5. Partidas con precio $0.00 o "PROMO" en Purpose of Use
  const promoItems = input.items.filter(
    (it) =>
      !it.excluido &&
      (it.precioUnitario === 0 ||
        (it.purposeOfUse && /PROMO/i.test(it.purposeOfUse)))
  );
  for (const p of promoItems) {
    alerts.push({
      id: `PROMO_ITEM_${p.sku}`,
      severity: "YELLOW",
      titulo: `Artículo promocional o precio $0.00: ${p.sku}`,
      mensaje: `La partida tiene propósito "${p.purposeOfUse || "Sin precio"}". Preguntar tratamiento: ¿se factura con descuento del 100% o se excluye? (Validar con contador).`,
      skuRelacionado: p.sku,
      bloqueaTimbrado: false,
      accionSugerida: "Elige en la fila si aplicar 100% de descuento o excluir de la factura.",
    });
  }

  // 6. Texto en columna Reference (ej. "4pcs faltante")
  const refItems = input.items.filter((it) => it.reference && it.reference.trim() !== "");
  for (const r of refItems) {
    alerts.push({
      id: `REF_ITEM_${r.sku}`,
      severity: "YELLOW",
      titulo: `Nota en columna Reference: ${r.sku}`,
      mensaje: `La partida contiene la observación: "${r.reference}". Verifica que la cantidad facturada refleje el inventario real.`,
      skuRelacionado: r.sku,
      bloqueaTimbrado: false,
      accionSugerida: "Confirma si la cantidad a facturar es correcta.",
    });
  }

  // 7. Cantidades Invc Qty vs PI Qty diferentes
  const qtyMismatch = input.items.filter(
    (it) => it.piQty !== undefined && it.piQty !== null && it.piQty !== it.cantidad
  );
  for (const q of qtyMismatch) {
    alerts.push({
      id: `QTY_MISMATCH_${q.sku}`,
      severity: "YELLOW",
      titulo: `Diferencia de cantidades en ${q.sku}`,
      mensaje: `La cantidad facturada (Invc Qty: ${q.cantidad}) no coincide con la orden de compra original (PI Qty: ${q.piQty}).`,
      skuRelacionado: q.sku,
      bloqueaTimbrado: false,
      accionSugerida: "Confirma que la entrega parcial sea intencional.",
    });
  }

  // 8. Distinto PI No en las líneas
  const piNumbers = Array.from(
    new Set(input.items.map((i) => i.piNo).filter((p): p is string => Boolean(p && p.trim() !== "")))
  );
  if (piNumbers.length > 1) {
    alerts.push({
      id: "MULTIPLE_PI_NO",
      severity: "YELLOW",
      titulo: "Partidas con distintos números de PI",
      mensaje: `El archivo contiene partidas pertenecientes a más de una orden de compra: ${piNumbers.join(", ")}.`,
      bloqueaTimbrado: false,
      accionSugerida: "Confirma si deben facturarse juntas en este mismo CFDI.",
    });
  }

  // 9. Fecha ambigua extraída de formato binario
  if (input.fechaEsAmbigua) {
    alerts.push({
      id: "DATE_AMBIGUOUS",
      severity: "YELLOW",
      titulo: "Fecha del archivo con formato ambiguo",
      mensaje: "La fecha del archivo fue interpretada como MM-DD-AAAA. Confirma que corresponda al día y mes deseados.",
      bloqueaTimbrado: false,
      accionSugerida: "Revisa la fecha de emisión en el selector.",
    });
  }

  // 10. Fecha de emisión atrasada más de 72 horas
  const fechaDoc = new Date(input.fechaEmision);
  const now = new Date();
  const diffHours = (now.getTime() - fechaDoc.getTime()) / (1000 * 60 * 60);
  if (diffHours > 72) {
    alerts.push({
      id: "DATE_OVER_72_HOURS",
      severity: "YELLOW",
      titulo: "Fecha de emisión con más de 72 horas de atraso",
      mensaje: `La fecha seleccionada (${fechaDoc.toLocaleDateString()}) tiene más de 72 horas de antigüedad. El SAT permite timbrar facturas con hasta 72 horas hacia atrás.`,
      bloqueaTimbrado: false,
      accionSugerida: "Ajusta la fecha de emisión a un periodo vigente.",
    });
  }

  // 11. Aviso especial para cliente extranjero
  if (input.tipoFactura === "GLOBAL_EXTRANJERO") {
    alerts.push({
      id: "FOREIGN_TRADE_NOTICE",
      severity: "YELLOW",
      titulo: "Aviso de Comercio Exterior",
      mensaje: "Facturación para cliente extranjero: Puede requerir complemento de comercio exterior si la mercancía sale del país de forma definitiva (validar con agente aduanal / contador).",
      bloqueaTimbrado: false,
    });
  }

  return alerts;
}

