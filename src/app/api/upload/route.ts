import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDocument, formatInvoiceDescription, ParsedItem } from "@/lib/parsers";
import { calculateDocumentTaxes } from "@/lib/tax/calculator";
import { ensureTablesExist } from "@/lib/db-init";
import {
  getSatMappingForConcepto,
  isDeliveryFeeItem,
  CLAVE_PROD_PRODUCTO_DEFAULT,
  CLAVE_UNIDAD_PRODUCTO_DEFAULT,
  CLAVE_PROD_ENVIO_DEFAULT,
  CLAVE_UNIDAD_ENVIO_DEFAULT,
  DESCRIPCION_ENVIO_DEFAULT,
} from "@/lib/sat/catalog-defaults";

export async function POST(req: NextRequest) {
  try {
    // Asegurar que las tablas existan en MySQL y migración de claves
    await ensureTablesExist();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const envioFile = (formData.get("envioFile") || formData.get("shippingFile")) as File | null;
    const tipoFactura = (formData.get("tipoFactura") as string) || "CLIENTE";
    const clienteId = (formData.get("clienteId") as string) || null;
    const customDocNumber = (formData.get("docNumber") as string)?.trim() || null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo." }, { status: 400 });
    }

    // 1. Parsear archivo principal (productos)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsedPrincipal = parseDocument(buffer, file.name);

    let allItems: ParsedItem[] = [...parsedPrincipal.items];
    let totalWeightKg = parsedPrincipal.totalWeightKg;
    let fileSubtotal = parsedPrincipal.fileSubtotal;
    let fileTotal = parsedPrincipal.fileTotal;

    // 2. Parsear archivo secundario de envío si se proporcionó
    let tieneEnvioCombinado = false;
    let nombreArchivoEnvio = "";

    if (envioFile && envioFile.size > 0) {
      tieneEnvioCombinado = true;
      nombreArchivoEnvio = envioFile.name;
      const envioArrayBuffer = await envioFile.arrayBuffer();
      const envioBuffer = Buffer.from(envioArrayBuffer);
      const parsedEnvio = parseDocument(envioBuffer, envioFile.name);

      if (parsedEnvio.items && parsedEnvio.items.length > 0) {
        // Asegurar que cada concepto del archivo de envío sea identificado como tal
        const envioItems: ParsedItem[] = parsedEnvio.items.map((it) => ({
          ...it,
          sku: it.sku || "DELIVERYFEE",
          descripcion: DESCRIPCION_ENVIO_DEFAULT,
          brand: it.brand || "Envío",
        }));

        allItems = [...allItems, ...envioItems];
        totalWeightKg += parsedEnvio.totalWeightKg;
        fileSubtotal += parsedEnvio.fileSubtotal;
        fileTotal += parsedEnvio.fileTotal;
      }
    }

    const docNumberFinal = customDocNumber || parsedPrincipal.docNumber;

    // 3. Verificar si este documento ya fue timbrado
    const existingStamped = await prisma.documento.findFirst({
      where: {
        OR: [{ fileHash: parsedPrincipal.fileHash }, { docNumber: docNumberFinal }],
        estado: "TIMBRADO",
      },
      include: { timbre: true },
    });

    // 4. Consultar catálogo de productos (si existe personalización previa)
    const allSkus = allItems.map((i) => i.sku);
    const dbProducts = await prisma.productoSat.findMany({
      where: { sku: { in: allSkus } },
    });
    const productMap = new Map(dbProducts.map((p) => [p.sku, p]));

    // 5. Calcular impuestos totales con todas las partidas combinadas
    const taxRes = calculateDocumentTaxes(
      allItems.map((i) => ({
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
      })),
      fileSubtotal,
      fileTotal
    );

    // 6. Buscar si ya existía un borrador con este docNumber
    let documento = await prisma.documento.findUnique({
      where: { docNumber: docNumberFinal },
    });

    if (documento && documento.estado === "TIMBRADO") {
      return NextResponse.json({
        success: true,
        documentoId: documento.id,
        docNumber: documento.docNumber,
        yaTimbrado: true,
        mensaje: "El documento ya fue timbrado previamente.",
      });
    }

    // Determinar receptor por defecto
    let rfcReceptor = "";
    let nombreReceptor = "";
    let regimenReceptor = "";
    let cpReceptor = "";
    let usoCfdi = "G01";

    if (tipoFactura === "CLIENTE" && clienteId) {
      const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
      if (cliente) {
        rfcReceptor = cliente.rfc;
        nombreReceptor = cliente.razonSocial;
        regimenReceptor = cliente.regimenFiscal;
        cpReceptor = cliente.codigoPostal;
        usoCfdi = cliente.usoCfdiDefault || "G01";
      }
    } else if (tipoFactura === "GLOBAL_NACIONAL") {
      rfcReceptor = "XAXX010101000";
      nombreReceptor = "PUBLICO EN GENERAL";
      regimenReceptor = "616";
      cpReceptor = process.env.EMISOR_CP || "54090";
      usoCfdi = "S01";
    } else if (tipoFactura === "GLOBAL_EXTRANJERO") {
      rfcReceptor = "XEXX010101000";
      nombreReceptor = "PUBLICO GENERAL EXTRANJERO";
      regimenReceptor = "616";
      cpReceptor = process.env.EMISOR_CP || "54090";
      usoCfdi = "S01";
    }

    const docData = {
      docNumber: docNumberFinal,
      fileHash: parsedPrincipal.fileHash,
      formatoOrigen: parsedPrincipal.format,
      tipoFactura,
      clienteId,
      rfcReceptor,
      nombreReceptor,
      regimenReceptor,
      cpReceptor,
      usoCfdi,
      serie: process.env.EMISOR_SERIE || "F",
      formaPago: parsedPrincipal.headerMetadata.suggestedPaymentForm || "03",
      metodoPago: "PUE",
      subtotal: taxRes.subtotal,
      iva: taxRes.iva,
      total: taxRes.total,
      totalPiezas: taxRes.totalPiezas,
      pesoTotalKg: totalWeightKg,
      estado: "BORRADOR",
    };

    if (documento) {
      // Limpiar partidas previas del borrador y actualizar cabecera
      await prisma.documentoItem.deleteMany({ where: { documentoId: documento.id } });
      documento = await prisma.documento.update({
        where: { id: documento.id },
        data: docData,
      });
    } else {
      documento = await prisma.documento.create({
        data: docData,
      });
    }

    // 7. Insertar DocumentoItems con claves SAT automáticas
    // Reglas solicitadas:
    // - Todos los productos: Clave SAT 53131613 por default, Unidad H87 / Pieza.
    // - Deliveryfee: Clave SAT 78101800, Unidad E48 / Unidad de Servicio, Descripción "Servicio de envio".
    for (let idx = 0; idx < allItems.length; idx++) {
      const it = allItems[idx];
      const sat = getSatMappingForConcepto(it.sku, it.descripcion);
      const prod = productMap.get(it.sku);
      const lineTax = taxRes.lines[idx];

      const claveProdServ = sat.isEnvio
        ? CLAVE_PROD_ENVIO_DEFAULT
        : (prod?.claveProdServ || CLAVE_PROD_PRODUCTO_DEFAULT);

      const claveUnidad = sat.isEnvio
        ? CLAVE_UNIDAD_ENVIO_DEFAULT
        : (prod?.claveUnidad || CLAVE_UNIDAD_PRODUCTO_DEFAULT);

      const descripcionFinal = sat.isEnvio
        ? DESCRIPCION_ENVIO_DEFAULT
        : formatInvoiceDescription(it.brand, prod?.descripcion || it.descripcion);

      await prisma.documentoItem.create({
        data: {
          documentoId: documento.id,
          piNo: it.piNo,
          sku: it.sku,
          descripcion: descripcionFinal,
          brand: it.brand,
          cantidad: it.cantidad,
          piQty: it.piQty,
          precioUnitario: it.precioUnitario,
          rateReferencia: it.rateReferencia,
          retailPrice: it.retailPrice,
          base: lineTax.base,
          iva: lineTax.iva,
          importe: lineTax.importe,
          claveProdServ,
          claveUnidad,
          purposeOfUse: it.purposeOfUse,
          reference: it.reference,
          barcode: it.barcode,
          pesoKg: it.weightKg,
        },
      });
    }

    // 8. Bitácora de carga
    const descCarga = tieneEnvioCombinado
      ? `Factura combinada: ${file.name} (Productos) + ${nombreArchivoEnvio} (Envío). Total: ${allItems.length} partidas.`
      : `Archivo ${file.name} procesado exitosamente (${allItems.length} partidas).`;

    await prisma.bitacoraEvento.create({
      data: {
        documentoId: documento.id,
        tipo: tieneEnvioCombinado ? "COMBINADO" : "CARGA",
        descripcion: descCarga,
        detalles: JSON.stringify({
          formato: parsedPrincipal.format,
          subtotal: taxRes.subtotal,
          iva: taxRes.iva,
          total: taxRes.total,
          piezas: taxRes.totalPiezas,
          tieneEnvio: tieneEnvioCombinado,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      documentoId: documento.id,
      docNumber: documento.docNumber,
      yaTimbrado: Boolean(existingStamped),
      headerMetadata: parsedPrincipal.headerMetadata,
      tieneEnvioCombinado,
    });
  } catch (error: any) {
    console.error("Error en /api/upload:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar el archivo." },
      { status: 500 }
    );
  }
}
