import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureTablesExist } from "@/lib/db-init";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { FacturaComPacClient } from "@/lib/pac/factura-com";

export const dynamic = "force-dynamic";

function maskSecret(secret?: string | null): string {
  if (!secret) return "";
  if (secret.length <= 6) return "••••••";
  return `••••••••${secret.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  try {
    await ensureTablesExist();

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionUser = token ? await verifySessionToken(token) : null;

    let allowedIds: string[] | null = null;
    if (sessionUser && sessionUser.rol !== "ADMIN") {
      const dbUser = await prisma.usuario.findUnique({
        where: { id: sessionUser.id },
        select: { empresasPermitidas: true },
      });
      if (dbUser?.empresasPermitidas) {
        try {
          const parsed = JSON.parse(dbUser.empresasPermitidas);
          if (Array.isArray(parsed) && parsed.length > 0) {
            allowedIds = parsed;
          }
        } catch {}
      }
    }

    const where: any = { activa: true };
    if (allowedIds && allowedIds.length > 0) {
      where.id = { in: allowedIds };
    }

    const empresas = await prisma.empresa.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { documentos: true, clientes: true },
        },
      },
    });

    const sanitized = empresas.map((e) => ({
      ...e,
      secretKey: undefined,
      hasSecretKey: Boolean(e.secretKey),
      secretKeyMasked: maskSecret(e.secretKey),
    }));

    return NextResponse.json({ success: true, empresas: sanitized });
  } catch (error: any) {
    console.error("Error al obtener empresas:", error);
    return NextResponse.json(
      { error: error?.message || "Error al consultar empresas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTablesExist();

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionUser = token ? await verifySessionToken(token) : null;

    if (!sessionUser || sessionUser.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos de Administrador para crear empresas." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      nombreCorto,
      razonSocial,
      rfc,
      regimenFiscal,
      codigoPostal,
      serie,
      apiKey,
      secretKey,
      ambiente,
      color,
      testConnection,
    } = body;

    if (!nombreCorto || !razonSocial || !rfc || !regimenFiscal || !codigoPostal) {
      return NextResponse.json(
        { error: "Los campos Nombre Corto, Razón Social, RFC, Régimen y C.P. son obligatorios." },
        { status: 400 }
      );
    }

    const cleanRfc = rfc.trim().toUpperCase();

    // Validar RFC duplicado
    const existe = await prisma.empresa.findUnique({
      where: { rfc: cleanRfc },
    });
    if (existe) {
      return NextResponse.json(
        { error: `Ya existe una empresa registrada con el RFC ${cleanRfc} ("${existe.nombreCorto}").` },
        { status: 409 }
      );
    }

    // Probar conexión opcional si se proporcionaron credenciales
    if (testConnection && apiKey && secretKey) {
      try {
        const testPac = new FacturaComPacClient({
          apiKey: apiKey.trim(),
          secretKey: secretKey.trim(),
          environment: ambiente || "production",
        });
        const series = await testPac.resolverSerieId(serie || "F", "factura").catch(() => null);
        // Si no lanza excepción fatal, las credenciales son válidas
      } catch (pacErr: any) {
        return NextResponse.json(
          { error: `Error de conexión con Factura.com: ${pacErr.message}` },
          { status: 400 }
        );
      }
    }

    const nuevaEmpresa = await prisma.empresa.create({
      data: {
        nombreCorto: nombreCorto.trim(),
        razonSocial: razonSocial.trim().toUpperCase(),
        rfc: cleanRfc,
        regimenFiscal: regimenFiscal.trim(),
        codigoPostal: codigoPostal.trim(),
        serie: (serie && serie.trim().toUpperCase()) || "F",
        apiKey: apiKey ? apiKey.trim() : null,
        secretKey: secretKey ? secretKey.trim() : null,
        ambiente: ambiente || "production",
        color: color || "blue",
        activa: true,
      },
    });

    return NextResponse.json({
      success: true,
      empresa: {
        ...nuevaEmpresa,
        secretKey: undefined,
        hasSecretKey: Boolean(nuevaEmpresa.secretKey),
        secretKeyMasked: maskSecret(nuevaEmpresa.secretKey),
      },
      mensaje: `Empresa "${nuevaEmpresa.nombreCorto}" creada exitosamente.`,
    });
  } catch (error: any) {
    console.error("Error al crear empresa:", error);
    return NextResponse.json(
      { error: error?.message || "Error al crear empresa" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureTablesExist();

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionUser = token ? await verifySessionToken(token) : null;

    if (!sessionUser || sessionUser.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos de Administrador para editar empresas." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      id,
      nombreCorto,
      razonSocial,
      rfc,
      regimenFiscal,
      codigoPostal,
      serie,
      apiKey,
      secretKey,
      ambiente,
      color,
      activa,
    } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "ID de la empresa es obligatorio." },
        { status: 400 }
      );
    }

    const empresaExistente = await prisma.empresa.findUnique({
      where: { id },
    });
    if (!empresaExistente) {
      return NextResponse.json(
        { error: "Empresa no encontrada." },
        { status: 404 }
      );
    }

    const cleanRfc = rfc ? rfc.trim().toUpperCase() : empresaExistente.rfc;
    if (cleanRfc !== empresaExistente.rfc) {
      const duplicado = await prisma.empresa.findUnique({
        where: { rfc: cleanRfc },
      });
      if (duplicado && duplicado.id !== id) {
        return NextResponse.json(
          { error: `Ya existe otra empresa con el RFC ${cleanRfc}.` },
          { status: 409 }
        );
      }
    }

    // Si secretKey viene como máscara (••••) o vacía, preservar la anterior
    let finalSecretKey = empresaExistente.secretKey;
    if (secretKey && typeof secretKey === "string" && !secretKey.includes("••••")) {
      finalSecretKey = secretKey.trim();
    }

    const actualizada = await prisma.empresa.update({
      where: { id },
      data: {
        nombreCorto: nombreCorto ? nombreCorto.trim() : empresaExistente.nombreCorto,
        razonSocial: razonSocial ? razonSocial.trim().toUpperCase() : empresaExistente.razonSocial,
        rfc: cleanRfc,
        regimenFiscal: regimenFiscal ? regimenFiscal.trim() : empresaExistente.regimenFiscal,
        codigoPostal: codigoPostal ? codigoPostal.trim() : empresaExistente.codigoPostal,
        serie: serie ? serie.trim().toUpperCase() : empresaExistente.serie,
        apiKey: apiKey !== undefined ? (apiKey ? apiKey.trim() : null) : empresaExistente.apiKey,
        secretKey: finalSecretKey,
        ambiente: ambiente || empresaExistente.ambiente,
        color: color || empresaExistente.color,
        activa: activa !== undefined ? Boolean(activa) : empresaExistente.activa,
      },
    });

    return NextResponse.json({
      success: true,
      empresa: {
        ...actualizada,
        secretKey: undefined,
        hasSecretKey: Boolean(actualizada.secretKey),
        secretKeyMasked: maskSecret(actualizada.secretKey),
      },
      mensaje: `Empresa "${actualizada.nombreCorto}" actualizada exitosamente.`,
    });
  } catch (error: any) {
    console.error("Error al actualizar empresa:", error);
    return NextResponse.json(
      { error: error?.message || "Error al actualizar empresa" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTablesExist();

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionUser = token ? await verifySessionToken(token) : null;

    if (!sessionUser || sessionUser.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos de Administrador para eliminar empresas." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de la empresa es obligatorio" }, { status: 400 });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id },
      include: { _count: { select: { documentos: true } } },
    });

    if (!empresa) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }

    // No permitir eliminar la última empresa
    const totalEmpresas = await prisma.empresa.count({ where: { activa: true } });
    if (totalEmpresas <= 1) {
      return NextResponse.json(
        { error: "No puedes desactivar o eliminar la única empresa activa del sistema." },
        { status: 400 }
      );
    }

    // Si tiene documentos, desactivar en lugar de borrar físicamente para integridad contable
    if (empresa._count.documentos > 0) {
      await prisma.empresa.update({
        where: { id },
        data: { activa: false },
      });
      return NextResponse.json({
        success: true,
        desactivada: true,
        mensaje: `Empresa "${empresa.nombreCorto}" desactivada. Sus facturas históricas se conservan intactas.`,
      });
    }

    await prisma.empresa.delete({ where: { id } });
    return NextResponse.json({
      success: true,
      mensaje: `Empresa "${empresa.nombreCorto}" eliminada del sistema.`,
    });
  } catch (error: any) {
    console.error("Error al eliminar empresa:", error);
    return NextResponse.json(
      { error: error?.message || "Error al eliminar empresa" },
      { status: 500 }
    );
  }
}
