import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPacClient } from "@/lib/pac/factory";
import { checkDocumentAlerts } from "@/lib/alerts/checker";
import { CfdiPayload } from "@/lib/pac/pac-interface";
import {
  isDeliveryFeeItem,
  CLAVE_PROD_ENVIO_DEFAULT,
  CLAVE_PROD_PRODUCTO_DEFAULT,
  CLAVE_UNIDAD_ENVIO_DEFAULT,
  CLAVE_UNIDAD_PRODUCTO_DEFAULT,
  UNIDAD_ENVIO_DEFAULT,
  UNIDAD_PRODUCTO_DEFAULT,
  DESCRIPCION_ENVIO_DEFAULT,
} from "@/lib/sat/catalog-defaults";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentoId, simularFalla } = body;

    if (!documentoId) {
      return NextResponse.json({ error: "documentoId es requerido" }, { status: 400 });
    }

    const doc = await prisma.documento.findUnique({
      where: { id: documentoId },
      include: {
        cliente: true,
        items: true,
        timbre: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    // 1. CONTROL DE IDEMPOTENCIA: Si ya está timbrado, devolver el timbre existente sin duplicar
    if (doc.timbre && doc.estado === "TIMBRADO") {
      return NextResponse.json({
        success: true,
        idempotente: true,
        mensaje: "El documento ya cuenta con un CFDI timbrado previamente.",
        timbre: doc.timbre,
        uuid: doc.timbre.uuid,
      });
    }

    // 2. VALIDAR ALERTAS ROJAS (Bloqueantes)
    const alerts = checkDocumentAlerts({
      docNumber: doc.docNumber,
      fileHash: doc.fileHash,
      tipoFactura: doc.tipoFactura,
      fechaEmision: doc.fechaEmision,
      cliente: doc.cliente
        ? {
            rfc: doc.cliente.rfc,
            razonSocial: doc.cliente.razonSocial,
            codigoPostal: doc.cliente.codigoPostal,
            regimenFiscal: doc.cliente.regimenFiscal,
            usoCfdi: doc.cliente.usoCfdiDefault,
          }
        : doc.rfcReceptor
        ? {
            rfc: doc.rfcReceptor,
            razonSocial: doc.nombreReceptor || "",
            codigoPostal: doc.cpReceptor || "",
            regimenFiscal: doc.regimenReceptor || "",
            usoCfdi: doc.usoCfdi || "",
          }
        : null,
      items: doc.items.map((i) => ({
        sku: i.sku,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        piQty: i.piQty,
        precioUnitario: i.precioUnitario,
        claveProdServ: i.claveProdServ,
        purposeOfUse: i.purposeOfUse,
        reference: i.reference,
        piNo: i.piNo,
        excluido: i.excluido,
        descuentoCien: i.descuentoCien,
      })),
      subtotalCalculado: doc.subtotal,
      totalCalculado: doc.total,
    });

    const redAlerts = alerts.filter((a) => a.bloqueaTimbrado);
    if (redAlerts.length > 0) {
      return NextResponse.json(
        {
          error: "No es posible timbrar: existen alertas críticas no resueltas.",
          redAlerts,
        },
        { status: 400 }
      );
    }

    // 3. Preparar payload CFDI 4.0
    const pac = getPacClient();
    const activeItems = doc.items.filter(
      (i) => !i.excluido && (doc.tipoFactura === "TRASLADO" || i.precioUnitario > 0)
    );

    // Complemento Carta Porte si aplica
    let cartaPortePayload: any = undefined;
    if (doc.tipoFactura === "TRASLADO" && doc.datosCartaPorte) {
      try {
        const cpData = JSON.parse(doc.datosCartaPorte);
        cartaPortePayload = {
          transporteInternacional: "No",
          totalDistRec: cpData.distanciaKm || 500,
          pesoBrutoTotal: cpData.pesoBrutoTotal || doc.pesoTotalKg || 60.166,
          numTotalMercancias: activeItems.length,
          ubicaciones: [
            { tipo: "Origen", domicilio: cpData.origen || "CDMX" },
            { tipo: "Destino", domicilio: cpData.destino || "Guadalajara", distanciaRecorrida: cpData.distanciaKm || 500 },
          ],
          mercancias: activeItems.map((i) => ({
            bienesTransp: i.claveProdServ || "53131600",
            descripcion: i.descripcion,
            cantidad: i.cantidad,
            claveUnidad: i.claveUnidad || "H87",
            pesoEnKg: i.pesoKg || 1.0,
          })),
          autotransporte: {
            permSCT: "TPXX00",
            numPermisoSCT: "PERM-DEMO-991",
            identificacionVehicular: {
              configVehicular: cpData.vehiculo || "Camión unitario",
              placaVM: cpData.placas || "LC-88-921",
              anioModeloVM: 2023,
            },
          },
          operador: {
            rfcOperador: cpData.rfcOperador || "SAMR7906148K2",
            nombreOperador: cpData.operador || "Roberto Sánchez Mendoza",
          },
        };
      } catch (e) {
        console.error("Error parseando datos Carta Porte:", e);
      }
    }

    // Información Global si aplica (Público en General / Factura Global CFDI 4.0)
    const isPublicoGeneral =
      doc.tipoFactura === "GLOBAL_NACIONAL" ||
      (doc.rfcReceptor && doc.rfcReceptor.trim().toUpperCase() === "XAXX010101000") ||
      (doc.nombreReceptor && doc.nombreReceptor.toUpperCase().includes("PUBLICO EN GENERAL"));

    let informacionGlobalPayload: any = undefined;
    if (isPublicoGeneral) {
      let parsedInfo: any = {};
      if (doc.infoGlobal) {
        try {
          parsedInfo = typeof doc.infoGlobal === "string" ? JSON.parse(doc.infoGlobal) : doc.infoGlobal;
        } catch (err) {
          console.warn("No se pudo parsear infoGlobal:", err);
        }
      }

      const fechaDoc = doc.fechaEmision ? new Date(doc.fechaEmision) : new Date();
      const mesActual = String(fechaDoc.getMonth() + 1).padStart(2, "0");
      const anioActual = fechaDoc.getFullYear();

      informacionGlobalPayload = {
        periodicidad: String(parsedInfo.periodicidad || "01"),
        meses: String(parsedInfo.meses || mesActual).padStart(2, "0"),
        año: Number(parsedInfo.año || parsedInfo.anio || anioActual),
      };
    }

    const emisorCp = process.env.EMISOR_CP || "54090";

    const receptorPayload = isPublicoGeneral
      ? {
          rfc: "XAXX010101000",
          nombre: "PUBLICO EN GENERAL",
          domicilioFiscalReceptor: emisorCp, // En CFDI 4.0 para XAXX010101000 el CP debe ser el de expedición
          regimenFiscalReceptor: "616",     // CFDI 4.0 exige 616 (Sin obligaciones fiscales)
          usoCfdi: "S01",                   // CFDI 4.0 exige S01 (Sin efectos fiscales)
        }
      : {
          rfc: doc.rfcReceptor || doc.cliente?.rfc || "XAXX010101000",
          nombre: doc.nombreReceptor || doc.cliente?.razonSocial || "PUBLICO EN GENERAL",
          domicilioFiscalReceptor: doc.cpReceptor || doc.cliente?.codigoPostal || emisorCp,
          regimenFiscalReceptor: doc.regimenReceptor || doc.cliente?.regimenFiscal || "616",
          usoCfdi: doc.usoCfdi || doc.cliente?.usoCfdiDefault || "G03",
        };

    const payload: CfdiPayload = {
      serie: doc.serie,
      folio: doc.folio,
      docNumber: doc.docNumber,
      numOrder: doc.docNumber,
      fecha: doc.fechaEmision.toISOString().replace(/\.\d{3}Z$/, ""),
      formaPago: doc.formaPago,
      metodoPago: doc.metodoPago,
      moneda: "MXN",
      tipoDeComprobante: doc.tipoFactura === "TRASLADO" ? "T" : "I",
      exportacion: doc.tipoFactura === "GLOBAL_EXTRANJERO" ? "02" : "01",
      lugarExpedicion: emisorCp,
      subtotal: doc.subtotal,
      total: doc.total,
      totalIva: doc.iva,
      emisor: {
        rfc: process.env.EMISOR_RFC || "SMX250408I48",
        nombre: process.env.EMISOR_NOMBRE || "STYLEKOREAN MX",
        regimenFiscal: process.env.EMISOR_REGIMEN || "601",
      },
      receptor: receptorPayload,
      informacionGlobal: informacionGlobalPayload,
      conceptos: activeItems.map((i) => {
        const isEnvio = isDeliveryFeeItem(i.sku, i.descripcion, i.claveProdServ, i.claveUnidad);
        return {
          claveProdServ: isEnvio ? CLAVE_PROD_ENVIO_DEFAULT : (i.claveProdServ || CLAVE_PROD_PRODUCTO_DEFAULT),
          noIdentificacion: i.sku || (isEnvio ? "DELIVERYFEE" : ""),
          cantidad: i.cantidad,
          claveUnidad: isEnvio ? CLAVE_UNIDAD_ENVIO_DEFAULT : (i.claveUnidad || CLAVE_UNIDAD_PRODUCTO_DEFAULT),
          unidad: isEnvio ? UNIDAD_ENVIO_DEFAULT : UNIDAD_PRODUCTO_DEFAULT,
          descripcion: isEnvio ? DESCRIPCION_ENVIO_DEFAULT : i.descripcion,
          valorUnitario: i.precioUnitario,
          importe: i.base,
          objetoImp: "02",
          iva: i.iva,
        };
      }),
      cartaPorte: cartaPortePayload,
    };

    // 4. Invocar cliente PAC (Mock)
    const result = await pac.timbrar(payload, { simularFalla });

    if (!result.success) {
      // Registrar falla en bitácora
      await prisma.bitacoraEvento.create({
        data: {
          documentoId: doc.id,
          tipo: "ERROR_PAC",
          descripcion: result.errorMessage || "Fallo simulado del PAC",
          detalles: JSON.stringify({ errorCode: result.errorCode, simularFalla }),
        },
      });

      return NextResponse.json(
        {
          error: result.errorMessage,
          errorCode: result.errorCode,
        },
        { status: 502 }
      );
    }

    // 5. Guardar TimbreFiscal en base de datos
    const timbre = await prisma.timbreFiscal.create({
      data: {
        documentoId: doc.id,
        uuid: result.uuid!,
        fechaTimbrado: new Date(result.fechaTimbrado!),
        noCertificadoSat: result.noCertificadoSat!,
        selloCfd: result.selloCfd!,
        selloSat: result.selloSat!,
        cadenaOriginal: result.cadenaOriginal!,
        xmlContent: result.xmlContent!,
        estado: "VIGENTE",
      },
    });

    // Actualizar estado del documento
    await prisma.documento.update({
      where: { id: doc.id },
      data: { estado: "TIMBRADO" },
    });

    // Registrar en bitácora
    await prisma.bitacoraEvento.create({
      data: {
        documentoId: doc.id,
        tipo: "TIMBRADO",
        descripcion: `CFDI 4.0 timbrado exitosamente con UUID: ${timbre.uuid}.`,
        detalles: JSON.stringify({
          uuid: timbre.uuid,
          total: doc.total,
          tipoFactura: doc.tipoFactura,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      uuid: timbre.uuid,
      timbre,
    });
  } catch (error: any) {
    console.error("Error en /api/timbrar:", error);
    return NextResponse.json({ error: error?.message || "Error al timbrar" }, { status: 500 });
  }
}

