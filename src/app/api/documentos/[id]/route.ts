import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateDocumentTaxes, round2 } from "@/lib/tax/calculator";
import { checkDocumentAlerts } from "@/lib/alerts/checker";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await prisma.documento.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        items: true,
        timbre: true,
        bitacora: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    // Auto-excluir partidas con precio $0 si el documento es borrador (el SAT no admite precio $0)
    if (doc.estado !== "TIMBRADO") {
      const zeroPriceItems = doc.items.filter((i) => i.precioUnitario <= 0 && !i.excluido);
      if (zeroPriceItems.length > 0) {
        await prisma.documentoItem.updateMany({
          where: { id: { in: zeroPriceItems.map((i) => i.id) } },
          data: { excluido: true, descuentoCien: false },
        });
        for (const it of doc.items) {
          if (it.precioUnitario <= 0) {
            it.excluido = true;
            it.descuentoCien = false;
          }
        }
      }
    }

    // Check if another stamped document has same docNumber or fileHash
    const otherStamped = await prisma.documento.findFirst({
      where: {
        id: { not: doc.id },
        OR: [{ fileHash: doc.fileHash }, { docNumber: doc.docNumber }],
        estado: "TIMBRADO",
      },
    });

    const isAlreadyStamped = doc.estado === "TIMBRADO" || Boolean(otherStamped);

    // Check alerts
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
      documentoYaTimbrado: isAlreadyStamped,
    });

    return NextResponse.json({
      documento: doc,
      alerts,
      canTimbrar: !alerts.some((a) => a.bloqueaTimbrado),
    });
  } catch (error: any) {
    console.error("Error al obtener documento:", error);
    return NextResponse.json({ error: error?.message || "Error al obtener documento" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const docId = params.id;

    const existingDoc = await prisma.documento.findUnique({
      where: { id: docId },
      include: { items: true },
    });

    if (!existingDoc) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    // 1. Update item treatments if provided (e.g. promo discount 100% or exclude)
    if (body.itemUpdates && Array.isArray(body.itemUpdates)) {
      for (const update of body.itemUpdates) {
        if (!update.id) continue;
        const currentItem = existingDoc.items.find((i) => i.id === update.id);
        if (!currentItem) continue;

        const cantidad = update.cantidad !== undefined ? Number(update.cantidad) : currentItem.cantidad;
        const precioUnitario = update.precioUnitario !== undefined ? Number(update.precioUnitario) : currentItem.precioUnitario;
        const excluido = update.excluido !== undefined ? Boolean(update.excluido) : currentItem.excluido;
        const descuentoCien = update.descuentoCien !== undefined ? Boolean(update.descuentoCien) : currentItem.descuentoCien;

        let base = excluido ? 0 : round2(cantidad * precioUnitario);
        let iva = excluido || descuentoCien ? 0 : round2(base * 0.16);
        let importe = excluido ? 0 : round2(base + iva);

        await prisma.documentoItem.update({
          where: { id: update.id },
          data: {
            cantidad,
            precioUnitario,
            excluido,
            descuentoCien,
            base: descuentoCien ? 0 : base,
            iva,
            importe: descuentoCien ? 0 : importe,
            claveProdServ: update.claveProdServ !== undefined ? update.claveProdServ : currentItem.claveProdServ,
          },
        });
      }
    }

    // 2. Update general doc properties if provided
    const updateData: any = {};
    if (body.tipoFactura) updateData.tipoFactura = body.tipoFactura;

    // Actualizar número de orden / pedido manualmente (IN0049XXXX)
    if (body.docNumber !== undefined) {
      const trimmed = String(body.docNumber).trim();
      if (trimmed) {
        const existingWithSameNum = await prisma.documento.findFirst({
          where: { docNumber: trimmed, id: { not: docId } },
        });
        if (existingWithSameNum) {
          if (existingWithSameNum.estado === "TIMBRADO") {
            return NextResponse.json(
              { error: `El número de pedido "${trimmed}" ya fue timbrado previamente en otra factura.` },
              { status: 400 }
            );
          } else {
            await prisma.documento.update({
              where: { id: existingWithSameNum.id },
              data: { docNumber: `${existingWithSameNum.docNumber}-OLD-${Date.now()}` },
            });
          }
        }
        updateData.docNumber = trimmed;
      }
    }
    
    if (body.clienteId) {
      updateData.clienteId = body.clienteId;
      const c = await prisma.cliente.findUnique({ where: { id: body.clienteId } });
      if (c) {
        if (!body.rfcReceptor) updateData.rfcReceptor = c.rfc;
        if (!body.nombreReceptor) updateData.nombreReceptor = c.razonSocial;
        if (!body.regimenReceptor) updateData.regimenReceptor = c.regimenFiscal;
        if (!body.cpReceptor) updateData.cpReceptor = c.codigoPostal;
        if (!body.usoCfdi) updateData.usoCfdi = c.usoCfdiDefault;
      }
    } else if (body.clienteId === null) {
      updateData.clienteId = null;
    }

    if (body.rfcReceptor !== undefined) updateData.rfcReceptor = body.rfcReceptor;
    if (body.nombreReceptor !== undefined) updateData.nombreReceptor = body.nombreReceptor;
    if (body.regimenReceptor !== undefined) updateData.regimenReceptor = body.regimenReceptor;
    if (body.cpReceptor !== undefined) updateData.cpReceptor = body.cpReceptor;
    if (body.usoCfdi !== undefined) updateData.usoCfdi = body.usoCfdi;
    if (body.formaPago !== undefined) updateData.formaPago = body.formaPago;
    if (body.metodoPago !== undefined) updateData.metodoPago = body.metodoPago;
    if (body.serie !== undefined) updateData.serie = body.serie;
    if (body.fechaEmision) updateData.fechaEmision = new Date(body.fechaEmision);
    if (body.infoGlobal) updateData.infoGlobal = JSON.stringify(body.infoGlobal);
    if (body.datosExtranjero) updateData.datosExtranjero = JSON.stringify(body.datosExtranjero);
    if (body.datosCartaPorte) updateData.datosCartaPorte = JSON.stringify(body.datosCartaPorte);

    // 3. Recalculate totals from active items
    const allItems = await prisma.documentoItem.findMany({ where: { documentoId: docId } });
    const taxCalc = calculateDocumentTaxes(
      allItems.map((i) => ({
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        excluido: i.excluido,
        descuentoCien: i.descuentoCien,
      }))
    );

    updateData.subtotal = taxCalc.subtotal;
    updateData.iva = taxCalc.iva;
    updateData.total = taxCalc.total;
    updateData.totalPiezas = taxCalc.totalPiezas;

    const updated = await prisma.documento.update({
      where: { id: docId },
      data: updateData,
      include: {
        cliente: true,
        items: true,
        timbre: true,
      },
    });

    return NextResponse.json({ success: true, documento: updated });
  } catch (error: any) {
    console.error("Error al actualizar documento:", error);
    return NextResponse.json({ error: error?.message || "Error al actualizar documento" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const docId = params.id;
    const doc = await prisma.documento.findUnique({
      where: { id: docId },
      include: { timbre: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
    }

    if (doc.estado === "TIMBRADO" || doc.timbre) {
      return NextResponse.json(
        {
          error:
            "No es posible eliminar un comprobante timbrado ante el SAT por integridad fiscal. Si requieres anularlo, utiliza la opción Cancelar CFDI.",
        },
        { status: 400 }
      );
    }

    // Eliminar partidas y bitácora asociadas
    await prisma.documentoItem.deleteMany({ where: { documentoId: docId } });
    await prisma.bitacoraEvento.deleteMany({ where: { documentoId: docId } });
    await prisma.documento.delete({ where: { id: docId } });

    return NextResponse.json({
      success: true,
      mensaje: `Borrador ${doc.docNumber} eliminado exitosamente del sistema.`,
    });
  } catch (error: any) {
    console.error("Error al eliminar borrador:", error);
    return NextResponse.json(
      { error: error?.message || "Error al eliminar el borrador." },
      { status: 500 }
    );
  }
}

