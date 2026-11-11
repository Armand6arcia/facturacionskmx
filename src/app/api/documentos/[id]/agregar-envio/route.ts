import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDocument } from "@/lib/parsers";
import { calculateDocumentTaxes } from "@/lib/tax/calculator";
import { isDeliveryFeeItem, getSatMappingForConcepto, CLAVE_PROD_ENVIO_DEFAULT, CLAVE_UNIDAD_ENVIO_DEFAULT, DESCRIPCION_ENVIO_DEFAULT } from "@/lib/sat/catalog-defaults";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const docId = params.id;
    const doc = await prisma.documento.findUnique({
      where: { id: docId },
      include: { items: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
    }

    if (doc.estado === "TIMBRADO") {
      return NextResponse.json(
        { error: "No se pueden agregar conceptos a una factura ya timbrada." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo de envío." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = parseDocument(buffer, file.name);

    if (!parsed.items || parsed.items.length === 0) {
      return NextResponse.json({ error: "El archivo no contiene partidas válidas." }, { status: 400 });
    }

    // Insertar partidas de envío
    for (const it of parsed.items) {
      const isEnvio = isDeliveryFeeItem(it.sku, it.descripcion);
      const sat = getSatMappingForConcepto(it.sku, it.descripcion);
      const claveProdServ = isEnvio ? CLAVE_PROD_ENVIO_DEFAULT : sat.claveProdServ;
      const claveUnidad = isEnvio ? CLAVE_UNIDAD_ENVIO_DEFAULT : sat.claveUnidad;
      const descripcion = isEnvio ? DESCRIPCION_ENVIO_DEFAULT : (it.descripcion || DESCRIPCION_ENVIO_DEFAULT);

      const base = Number((it.cantidad * it.precioUnitario).toFixed(2));
      const iva = Number((base * 0.16).toFixed(2));
      const importe = Number((base + iva).toFixed(2));

      await prisma.documentoItem.create({
        data: {
          documentoId: docId,
          sku: it.sku || "DELIVERYFEE",
          descripcion,
          brand: it.brand || "Envío",
          cantidad: it.cantidad || 1,
          precioUnitario: it.precioUnitario,
          base,
          iva,
          importe,
          claveProdServ,
          claveUnidad,
          excluido: false,
          descuentoCien: false,
        },
      });
    }

    // Recalcular totales con todas las partidas (productos + nuevo envío)
    const allItems = await prisma.documentoItem.findMany({ where: { documentoId: docId } });
    const taxCalc = calculateDocumentTaxes(
      allItems.map((i) => ({
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        excluido: i.excluido,
        descuentoCien: i.descuentoCien,
      }))
    );

    const updated = await prisma.documento.update({
      where: { id: docId },
      data: {
        subtotal: taxCalc.subtotal,
        iva: taxCalc.iva,
        total: taxCalc.total,
        totalPiezas: taxCalc.totalPiezas,
      },
      include: {
        cliente: true,
        items: true,
        timbre: true,
      },
    });

    // Registrar en bitácora
    await prisma.bitacoraEvento.create({
      data: {
        documentoId: docId,
        tipo: "COMBINADO",
        descripcion: `Se agregaron ${parsed.items.length} concepto(s) de envío desde el archivo ${file.name}.`,
        detalles: JSON.stringify({
          nuevoTotal: taxCalc.total,
          partidasAgregadas: parsed.items.length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      mensaje: `Se agregaron ${parsed.items.length} concepto(s) de envío exitosamente.`,
      documento: updated,
    });
  } catch (error: any) {
    console.error("Error al agregar envío a documento:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar el archivo de envío." },
      { status: 500 }
    );
  }
}
