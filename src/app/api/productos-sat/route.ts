import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Catálogo oficial de sugerencias SAT para StyleKorean México
const CATALOGO_DEMO_SUGERENCIAS = [
  { clave: "53131613", descripcion: "Clave SAT Oficial StyleKorean (Cosméticos, cuidado de la piel y tocador)" },
  { clave: "78101800", descripcion: "Servicio de transporte y envío local / mensajería (Deliveryfee)" },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sku = searchParams.get("sku");
    const soloSinMapear = searchParams.get("sinMapear") === "true";

    if (sku) {
      const prod = await prisma.productoSat.findUnique({ where: { sku } });
      return NextResponse.json({ producto: prod });
    }

    const where: any = {};
    if (soloSinMapear) {
      where.claveProdServ = null;
    }

    const productos = await prisma.productoSat.findMany({
      where,
      orderBy: { sku: "asc" },
    });

    return NextResponse.json({ productos, catalogoSugerencias: CATALOGO_DEMO_SUGERENCIAS });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error al consultar catálogo" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sku, claveProdServ, claveUnidad, objetoImp, tasaIVA, descripcion, barcode, hsCode } = body;

    if (!sku || !claveProdServ) {
      return NextResponse.json({ error: "SKU y Clave SAT son obligatorios." }, { status: 400 });
    }

    // 1. Guardar o actualizar en catálogo ProductoSat de manera PERSISTENTE
    const productoActualizado = await prisma.productoSat.upsert({
      where: { sku },
      update: {
        claveProdServ,
        claveUnidad: claveUnidad || "H87",
        objetoImp: objetoImp || "02",
        tasaIVA: tasaIVA !== undefined ? Number(tasaIVA) : 0.16,
        descripcion: descripcion || undefined,
        barcode: barcode || undefined,
        hsCode: hsCode || undefined,
        esDemo: true,
      },
      create: {
        sku,
        claveProdServ,
        claveUnidad: claveUnidad || "H87",
        objetoImp: objetoImp || "02",
        tasaIVA: tasaIVA !== undefined ? Number(tasaIVA) : 0.16,
        descripcion: descripcion || `Producto ${sku}`,
        barcode: barcode || undefined,
        hsCode: hsCode || undefined,
        esDemo: true,
      },
    });

    // 2. Cascada: Actualizar todas las partidas existentes con este SKU para no volver a preguntar
    await prisma.documentoItem.updateMany({
      where: { sku },
      data: {
        claveProdServ,
        claveUnidad: claveUnidad || "H87",
      },
    });

    return NextResponse.json({
      success: true,
      mensaje: "Clave SAT guardada exitosamente y actualizada en partidas.",
      producto: productoActualizado,
    });
  } catch (error: any) {
    console.error("Error al actualizar producto SAT:", error);
    return NextResponse.json({ error: error?.message || "Error al actualizar producto SAT" }, { status: 500 });
  }
}

