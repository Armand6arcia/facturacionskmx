import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPacClient } from "@/lib/pac/factory";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uuid, motivo, folioSustitucion } = body;

    if (!uuid || !motivo) {
      return NextResponse.json({ error: "UUID y motivo de cancelación son requeridos." }, { status: 400 });
    }

    const timbre = await prisma.timbreFiscal.findUnique({
      where: { uuid },
      include: { documento: true },
    });

    if (!timbre) {
      return NextResponse.json({ error: "Timbre no encontrado." }, { status: 404 });
    }

    const pac = getPacClient();
    const result = await pac.cancelar(uuid, motivo, folioSustitucion);

    if (result.success) {
      await prisma.timbreFiscal.update({
        where: { id: timbre.id },
        data: {
          estado: "CANCELADO",
          motivoCancelacion: motivo,
          fechaCancelacion: new Date(),
        },
      });

      await prisma.documento.update({
        where: { id: timbre.documentoId },
        data: { estado: "CANCELADO" },
      });

      await prisma.bitacoraEvento.create({
        data: {
          documentoId: timbre.documentoId,
          tipo: "CANCELACION",
          descripcion: result.mensaje,
          detalles: JSON.stringify({ motivo, folioSustitucion }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      mensaje: result.mensaje,
    });
  } catch (error: any) {
    console.error("Error al cancelar timbre:", error);
    return NextResponse.json({ error: error?.message || "Error al cancelar timbre" }, { status: 500 });
  }
}

