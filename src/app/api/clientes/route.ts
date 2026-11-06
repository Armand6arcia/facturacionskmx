import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    const where: any = {};
    if (query) {
      where.OR = [
        { razonSocial: { contains: query } },
        { rfc: { contains: query } },
      ];
    }

    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { razonSocial: "asc" },
    });

    return NextResponse.json({ clientes });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error al buscar clientes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rfc, razonSocial, codigoPostal, regimenFiscal, usoCfdiDefault, pais, esExtranjero } = body;

    if (!rfc || !razonSocial || !codigoPostal || !regimenFiscal) {
      return NextResponse.json({ error: "Todos los campos fiscales son requeridos." }, { status: 400 });
    }

    const cleanRfc = rfc.trim().toUpperCase();

    const nuevoCliente = await prisma.cliente.upsert({
      where: { rfc: cleanRfc },
      update: {
        razonSocial: razonSocial.trim().toUpperCase(),
        codigoPostal: codigoPostal.trim(),
        regimenFiscal: regimenFiscal.trim(),
        usoCfdiDefault: usoCfdiDefault || "G03",
        pais: pais || "MEX",
        esExtranjero: Boolean(esExtranjero),
      },
      create: {
        rfc: cleanRfc,
        razonSocial: razonSocial.trim().toUpperCase(),
        codigoPostal: codigoPostal.trim(),
        regimenFiscal: regimenFiscal.trim(),
        usoCfdiDefault: usoCfdiDefault || "G03",
        pais: pais || "MEX",
        esExtranjero: Boolean(esExtranjero),
      },
    });

    return NextResponse.json({ success: true, cliente: nuevoCliente });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error al registrar cliente" }, { status: 500 });
  }
}

