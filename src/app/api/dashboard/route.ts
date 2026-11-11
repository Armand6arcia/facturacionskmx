import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureTablesExist } from "@/lib/db-init";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureTablesExist();

    // 1. Estadísticas globales
    const [
      totalDocumentos,
      totalTimbrados,
      totalClientes,
      totalProductos,
      productosSinClave,
      ultimosDocs,
    ] = await Promise.all([
      prisma.documento.count(),
      prisma.documento.count({ where: { estado: "TIMBRADO" } }),
      prisma.cliente.count(),
      prisma.productoSat.count(),
      prisma.productoSat.count({ where: { claveProdServ: null } }),
      prisma.documento.findMany({
        take: 5,
        orderBy: { fechaEmision: "desc" },
        include: {
          cliente: {
            select: { razonSocial: true, rfc: true },
          },
          timbre: {
            select: { uuid: true, fechaTimbrado: true, estado: true },
          },
        },
      }),
    ]);

    // Calcular monto total de documentos timbrados
    const timbradosData = await prisma.documento.findMany({
      where: { estado: "TIMBRADO" },
      select: { total: true },
    });
    const montoTotalTimbrado = timbradosData.reduce((acc, doc) => acc + (doc.total || 0), 0);

    // Datos por defecto de la empresa emisora
    const empresa = {
      razonSocial: process.env.EMISOR_NOMBRE || "STYLEKOREAN MX",
      rfc: process.env.EMISOR_RFC || "SMX250408I48",
      regimenFiscal: process.env.EMISOR_REGIMEN || "601",
      regimenDescripcion: "General de Ley Personas Morales",
      codigoPostal: process.env.EMISOR_CP || "54090",
      lugarExpedicion: "54090",
      domicilioFiscal:
        "AV. JESUS REYES HEROLES 293 Col. UNID.MARAVILLAS CEYLAN, C.P. 54090, TLALNEPANTLA DE BAZ, TLALNEPANTLA DE BAZ, México",
      seriePorDefecto: "F",
      pacProvider: process.env.PAC_PROVIDER || "facturacom",
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
      },
      empresa,
      ultimosDocs: ultimosDocs.map((d) => ({
        id: d.id,
        docNumber: d.docNumber,
        tipoFactura: d.tipoFactura,
        estado: d.estado,
        fechaEmision: d.fechaEmision,
        total: d.total,
        moneda: "MXN",
        clienteNombre: d.cliente?.razonSocial || d.nombreReceptor || (d.tipoFactura === "GLOBAL_NACIONAL" ? "Público en General" : "Sin asignar"),
        clienteRfc: d.cliente?.rfc || d.rfcReceptor || "XAXX010101000",
        uuid: d.timbre?.uuid,
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
