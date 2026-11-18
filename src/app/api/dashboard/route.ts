import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureTablesExist } from "@/lib/db-init";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ensureTablesExist();

    const { searchParams } = new URL(req.url);
    const empresaIdParam = searchParams.get("empresaId") || req.cookies.get("sk_active_empresa_id")?.value;

    // Buscar empresa activa
    let activeEmpresa: any = null;
    if (empresaIdParam) {
      activeEmpresa = await prisma.empresa.findUnique({
        where: { id: empresaIdParam, activa: true },
      });
    }

    if (!activeEmpresa) {
      activeEmpresa = await prisma.empresa.findFirst({
        where: { activa: true },
        orderBy: { createdAt: "asc" },
      });
    }

    const docWhere: any = {};
    const clienteWhere: any = {};

    if (activeEmpresa) {
      docWhere.empresaId = activeEmpresa.id;
      clienteWhere.empresaId = activeEmpresa.id;
    }

    // 1. Estadísticas para la empresa seleccionada
    const [
      totalDocumentos,
      totalTimbrados,
      totalClientes,
      totalProductos,
      productosSinClave,
      totalUsuarios,
      ultimosDocs,
      todasEmpresas,
    ] = await Promise.all([
      prisma.documento.count({ where: docWhere }),
      prisma.documento.count({ where: { ...docWhere, estado: "TIMBRADO" } }),
      prisma.cliente.count({ where: clienteWhere }),
      prisma.productoSat.count(),
      prisma.productoSat.count({ where: { claveProdServ: null } }),
      prisma.usuario.count().catch(() => 0),
      prisma.documento.findMany({
        where: docWhere,
        take: 5,
        orderBy: { fechaEmision: "desc" },
        include: {
          cliente: {
            select: { razonSocial: true, rfc: true },
          },
          timbre: {
            select: { uuid: true, fechaTimbrado: true, estado: true },
          },
          empresa: {
            select: { nombreCorto: true, rfc: true, color: true },
          },
        },
      }),
      prisma.empresa.findMany({
        where: { activa: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          nombreCorto: true,
          razonSocial: true,
          rfc: true,
          regimenFiscal: true,
          codigoPostal: true,
          serie: true,
          color: true,
          ambiente: true,
        },
      }),
    ]);

    // Calcular monto total de documentos timbrados
    const timbradosData = await prisma.documento.findMany({
      where: { ...docWhere, estado: "TIMBRADO" },
      select: { total: true },
    });
    const montoTotalTimbrado = timbradosData.reduce((acc, doc) => acc + (doc.total || 0), 0);

    // Datos de la empresa emisora seleccionada
    const empresa = activeEmpresa
      ? {
          id: activeEmpresa.id,
          nombreCorto: activeEmpresa.nombreCorto,
          razonSocial: activeEmpresa.razonSocial,
          rfc: activeEmpresa.rfc,
          regimenFiscal: activeEmpresa.regimenFiscal,
          regimenDescripcion: "General de Ley Personas Morales",
          codigoPostal: activeEmpresa.codigoPostal,
          lugarExpedicion: activeEmpresa.codigoPostal,
          domicilioFiscal: `C.P. ${activeEmpresa.codigoPostal}, México`,
          seriePorDefecto: activeEmpresa.serie || "F",
          pacProvider: activeEmpresa.pacProvider || "facturacom",
          ambiente: activeEmpresa.ambiente || "production",
          color: activeEmpresa.color || "blue",
          versionCfdi: "4.0",
        }
      : {
          id: "default",
          nombreCorto: "StyleKorean MX",
          razonSocial: process.env.EMISOR_NOMBRE || "STYLEKOREAN MX",
          rfc: process.env.EMISOR_RFC || "SMX250408I48",
          regimenFiscal: process.env.EMISOR_REGIMEN || "601",
          regimenDescripcion: "General de Ley Personas Morales",
          codigoPostal: process.env.EMISOR_CP || "54090",
          lugarExpedicion: "54090",
          domicilioFiscal: "C.P. 54090, Tlalnepantla de Baz, México",
          seriePorDefecto: "F",
          pacProvider: process.env.PAC_PROVIDER || "facturacom",
          ambiente: "production",
          color: "blue",
          versionCfdi: "4.0",
        };

    return NextResponse.json({
      success: true,
      stats: {
        totalDocumentos,
        totalTimbrados,
        totalBorradores: totalDocumentos - totalTimbrados,
        montoTotalTimbrado,
        totalClientes,
        totalProductos,
        productosMapeados: totalProductos - productosSinClave,
        productosSinClave,
        totalUsuarios,
      },
      empresa,
      empresasDisponibles: todasEmpresas,
      ultimosDocs: ultimosDocs.map((d) => ({
        id: d.id,
        docNumber: d.docNumber,
        tipoFactura: d.tipoFactura,
        estado: d.estado,
        fechaEmision: d.fechaEmision,
        total: d.total,
        moneda: "MXN",
        clienteNombre:
          d.cliente?.razonSocial ||
          d.nombreReceptor ||
          (d.tipoFactura === "GLOBAL_NACIONAL" ? "Público en General" : "Sin asignar"),
        clienteRfc: d.cliente?.rfc || d.rfcReceptor || "XAXX010101000",
        uuid: d.timbre?.uuid,
        empresaNombre: d.empresa?.nombreCorto,
      })),
    });
  } catch (error: any) {
    console.error("Error al obtener datos del dashboard:", error);
    return NextResponse.json(
      { error: error?.message || "Error al cargar resumen del dashboard" },
      { status: 500 }
    );
  }
}
