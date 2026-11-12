import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureTablesExist } from "@/lib/db-init";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ensureTablesExist();

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
    await ensureTablesExist();

    const body = await req.json();
    const { rfc, razonSocial, codigoPostal, regimenFiscal, usoCfdiDefault, pais, esExtranjero } = body;

    if (!rfc || !razonSocial || !codigoPostal || !regimenFiscal) {
      return NextResponse.json({ error: "Todos los campos fiscales son requeridos." }, { status: 400 });
    }

    const cleanRfc = rfc.trim().toUpperCase();
    const cleanUso = (usoCfdiDefault && usoCfdiDefault.trim().toUpperCase()) || "G03";

    const nuevoCliente = await prisma.cliente.upsert({
      where: { rfc: cleanRfc },
      update: {
        razonSocial: razonSocial.trim().toUpperCase(),
        codigoPostal: codigoPostal.trim(),
        regimenFiscal: regimenFiscal.trim(),
        usoCfdiDefault: cleanUso,
        pais: pais || "MEX",
        esExtranjero: Boolean(esExtranjero),
      },
      create: {
        rfc: cleanRfc,
        razonSocial: razonSocial.trim().toUpperCase(),
        codigoPostal: codigoPostal.trim(),
        regimenFiscal: regimenFiscal.trim(),
        usoCfdiDefault: cleanUso,
        pais: pais || "MEX",
        esExtranjero: Boolean(esExtranjero),
      },
    });

    return NextResponse.json({ success: true, cliente: nuevoCliente });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error al registrar cliente" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureTablesExist();

    const body = await req.json();
    const { id, rfc, razonSocial, codigoPostal, regimenFiscal, usoCfdiDefault, pais, esExtranjero } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "El ID del cliente es obligatorio para actualizar." },
        { status: 400 }
      );
    }

    const clienteExistente = await prisma.cliente.findUnique({
      where: { id },
    });

    if (!clienteExistente) {
      return NextResponse.json(
        { error: "El cliente a editar no fue encontrado." },
        { status: 404 }
      );
    }

    const cleanRfc = rfc ? rfc.trim().toUpperCase() : clienteExistente.rfc;
    const cleanRazonSocial = razonSocial ? razonSocial.trim().toUpperCase() : clienteExistente.razonSocial;
    const cleanCp = codigoPostal ? codigoPostal.trim() : clienteExistente.codigoPostal;
    const cleanRegimen = regimenFiscal ? regimenFiscal.trim() : clienteExistente.regimenFiscal;
    const cleanUsoCfdi = usoCfdiDefault ? usoCfdiDefault.trim().toUpperCase() : (clienteExistente.usoCfdiDefault || "G03");

    // Si cambió el RFC, validar que no colisione con otro cliente existente
    if (cleanRfc !== clienteExistente.rfc) {
      const duplicado = await prisma.cliente.findUnique({
        where: { rfc: cleanRfc },
      });
      if (duplicado && duplicado.id !== id) {
        return NextResponse.json(
          { error: `Ya existe otro cliente registrado con el RFC "${cleanRfc}".` },
          { status: 409 }
        );
      }
    }

    const clienteActualizado = await prisma.cliente.update({
      where: { id },
      data: {
        rfc: cleanRfc,
        razonSocial: cleanRazonSocial,
        codigoPostal: cleanCp,
        regimenFiscal: cleanRegimen,
        usoCfdiDefault: cleanUsoCfdi,
        pais: pais || clienteExistente.pais || "MEX",
        esExtranjero: esExtranjero !== undefined ? Boolean(esExtranjero) : clienteExistente.esExtranjero,
      },
    });

    // Actualizar automáticamente cualquier borrador pendiente asociado a este cliente
    await prisma.documento.updateMany({
      where: {
        clienteId: id,
        estado: "BORRADOR",
      },
      data: {
        rfcReceptor: cleanRfc,
        nombreReceptor: cleanRazonSocial,
        cpReceptor: cleanCp,
        regimenReceptor: cleanRegimen,
        usoCfdi: cleanUsoCfdi,
      },
    });

    return NextResponse.json({ success: true, cliente: clienteActualizado });
  } catch (error: any) {
    console.error("Error al actualizar cliente:", error);
    return NextResponse.json(
      { error: error?.message || "Error al actualizar cliente." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTablesExist();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Se requiere el ID del cliente a eliminar." },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "El cliente a eliminar no fue encontrado." },
        { status: 404 }
      );
    }

    // Desvincular de documentos existentes para proteger integridad referencial
    await prisma.documento.updateMany({
      where: { clienteId: id },
      data: { clienteId: null },
    });

    await prisma.cliente.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Cliente "${cliente.razonSocial}" eliminado correctamente.`,
    });
  } catch (error: any) {
    console.error("Error al eliminar cliente:", error);
    return NextResponse.json(
      { error: error?.message || "Error al eliminar cliente." },
      { status: 500 }
    );
  }
}
