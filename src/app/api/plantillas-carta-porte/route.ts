import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const plantillas = await prisma.plantillaCartaPorte.findMany({
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json({ plantillas });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error al obtener plantillas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, origen, destino, distanciaKm, vehiculo, placas, operador, rfcOperador } = body;

    const nueva = await prisma.plantillaCartaPorte.create({
      data: {
        nombre: nombre || `Plantilla ${Date.now()}`,
        origen,
        destino,
        distanciaKm: Number(distanciaKm) || 100,
        vehiculo,
        placas,
        operador,
        rfcOperador,
      },
    });

    return NextResponse.json({ success: true, plantilla: nueva });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error al guardar plantilla" }, { status: 500 });
  }
}

