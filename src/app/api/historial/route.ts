import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado");
    const query = searchParams.get("q");
    const empresaId = searchParams.get("empresaId") || req.cookies.get("sk_active_empresa_id")?.value;

    const where: any = {};
    if (empresaId && empresaId !== "ALL") {
      where.empresaId = empresaId;
    }
    if (estado && estado !== "TODOS") {
      where.estado = estado;
    }
    if (query) {
      where.OR = [
        { docNumber: { contains: query } },
        { nombreReceptor: { contains: query } },
        { rfcReceptor: { contains: query } },
        { timbre: { uuid: { contains: query } } },
      ];
    }

    const [documentos, bitacora] = await Promise.all([
      prisma.documento.findMany({
        where,
        include: {
          cliente: true,
          timbre: true,
          empresa: {
            select: { nombreCorto: true, rfc: true, color: true },
          },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.bitacoraEvento.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: { documento: { select: { docNumber: true } } },
      }),
    ]);

    return NextResponse.json({ documentos, bitacora });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error al obtener historial" }, { status: 500 });
  }
}

