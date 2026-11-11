import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDocument, formatInvoiceDescription } from "@/lib/parsers";
import { calculateDocumentTaxes } from "@/lib/tax/calculator";
import { ensureTablesExist } from "@/lib/db-init";

export async function POST(req: NextRequest) {
  try {
    // Asegurar que las tablas existan en MySQL
    await ensureTablesExist();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const tipoFactura = (formData.get("tipoFactura") as string) || "CLIENTE";
    const clienteId = (formData.get("clienteId") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse document
    const parsed = parseDocument(buffer, file.name);

    // Check if a document with this hash or docNumber was already stamped
    const existingStamped = await prisma.documento.findFirst({
      where: {
        OR: [{ fileHash: parsed.fileHash }, { docNumber: parsed.docNumber }],
        estado: "TIMBRADO",
      },
      include: { timbre: true },
    });

    // Match each SKU against ProductoSat catalog
    const allSkus = parsed.items.map((i) => i.sku);
    const dbProducts = await prisma.productoSat.findMany({
      where: { sku: { in: allSkus } },
    });
    const productMap = new Map(dbProducts.map((p) => [p.sku, p]));

    // Calculate taxes
    const taxRes = calculateDocumentTaxes(
      parsed.items.map((i) => ({
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
      })),
      parsed.fileSubtotal,
      parsed.fileTotal
    );

    // Upsert Documento in DB (if draft exists, replace or update)
    let documento = await prisma.documento.findUnique({
      where: { docNumber: parsed.docNumber },
    });

    if (documento && documento.estado === "TIMBRADO") {
      // Document was already stamped
      return NextResponse.json({
        success: true,
        documentoId: documento.id,
        docNumber: documento.docNumber,
        yaTimbrado: true,
        mensaje: "El documento ya fue timbrado previamente.",
      });
    }

    // Determine receptor defaults if clienteId or global
    let rfcReceptor = "";
    let nombreReceptor = "";
    let regimenReceptor = "";
    let cpReceptor = "";
    let usoCfdi = "G03";

    if (tipoFactura === "CLIENTE" && clienteId) {
      const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
      if (cliente) {
        rfcReceptor = cliente.rfc;
        nombreReceptor = cliente.razonSocial;
        regimenReceptor = cliente.regimenFiscal;
        cpReceptor = cliente.codigoPostal;
        usoCfdi = cliente.usoCfdiDefault;
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
      docNumber: parsed.docNumber,
      fileHash: parsed.fileHash,
      formatoOrigen: parsed.format,
      tipoFactura,
      clienteId,
      rfcReceptor,
      nombreReceptor,
      regimenReceptor,
      cpReceptor,
      usoCfdi,
      serie: process.env.EMISOR_SERIE || "F",
      formaPago: parsed.headerMetadata.suggestedPaymentForm || "03",
      metodoPago: "PUE",
      subtotal: taxRes.subtotal,
      iva: taxRes.iva,
      total: taxRes.total,
      totalPiezas: taxRes.totalPiezas,
      pesoTotalKg: parsed.totalWeightKg,
      estado: "BORRADOR",
    };

    if (documento) {
      // Update existing draft
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

    // Insert DocumentoItems
    for (let idx = 0; idx < parsed.items.length; idx++) {
      const it = parsed.items[idx];
      const prod = productMap.get(it.sku);
      const lineTax = taxRes.lines[idx];

      await prisma.documentoItem.create({
        data: {
          documentoId: documento.id,
          piNo: it.piNo,
          sku: it.sku,
          descripcion: formatInvoiceDescription(it.brand, prod?.descripcion || it.descripcion),
          brand: it.brand,
          cantidad: it.cantidad,
          piQty: it.piQty,
          precioUnitario: it.precioUnitario,
          rateReferencia: it.rateReferencia,
          retailPrice: it.retailPrice,
          base: lineTax.base,
          iva: lineTax.iva,
          importe: lineTax.importe,
          claveProdServ: prod?.claveProdServ || null,
          claveUnidad: prod?.claveUnidad || "H87",
          purposeOfUse: it.purposeOfUse,
          reference: it.reference,
          barcode: it.barcode,
          pesoKg: it.weightKg,
        },
      });
    }

    // Log upload event in bitacora
    await prisma.bitacoraEvento.create({
      data: {
        documentoId: documento.id,
        tipo: "CARGA",
        descripcion: `Archivo ${file.name} cargado y procesado exitosamente (${parsed.items.length} partidas).`,
        detalles: JSON.stringify({
          formato: parsed.format,
          subtotal: taxRes.subtotal,
          iva: taxRes.iva,
          total: taxRes.total,
          piezas: taxRes.totalPiezas,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      documentoId: documento.id,
      docNumber: documento.docNumber,
      yaTimbrado: Boolean(existingStamped),
      headerMetadata: parsed.headerMetadata,
    });
  } catch (error: any) {
    console.error("Error en /api/upload:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar el archivo." },
      { status: 500 }
    );
  }
}

