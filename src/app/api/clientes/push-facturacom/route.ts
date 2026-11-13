import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FacturaComPacClient } from "@/lib/pac/factura-com";
import { ensureTablesExist } from "@/lib/db-init";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureTablesExist();

    const pac = new FacturaComPacClient();
    const clientes = await prisma.cliente.findMany({
      orderBy: { razonSocial: "asc" },
    });

    if (clientes.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        creados: 0,
        actualizados: 0,
        errores: 0,
        mensaje: "No hay clientes en la base de datos para sincronizar.",
      });
    }

    let creados = 0;
    let actualizados = 0;
    let errores = 0;
    const detalles: Array<{ rfc: string; action: string; error?: string }> = [];

    for (const c of clientes) {
      try {
        const res = await pac.sincronizarCliente({
          rfc: c.rfc,
          razonSocial: c.razonSocial,
          codigoPostal: c.codigoPostal,
          regimenFiscal: c.regimenFiscal,
          usoCfdi: c.usoCfdiDefault || "G03",
          pais: c.pais || "MEX",
          numRegIdTrib: c.numRegIdTrib,
        });

        if (res.success) {
          if (res.action === "created") creados++;
          else if (res.action === "updated") actualizados++;
          detalles.push({ rfc: c.rfc, action: res.action });
        } else {
          errores++;
          detalles.push({ rfc: c.rfc, action: "error", error: res.error });
        }
      } catch (err: any) {
        errores++;
        detalles.push({ rfc: c.rfc, action: "error", error: err?.message });
      }
    }

    const mensaje = `Sincronización completada: ${creados} nuevos dados de alta, ${actualizados} actualizados y ${errores} errores de un total de ${clientes.length} clientes.`;

    return NextResponse.json({
      success: true,
      total: clientes.length,
      creados,
      actualizados,
      errores,
      detalles,
      mensaje,
    });
  } catch (error: any) {
    console.error("Error en push-facturacom:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Error al sincronizar clientes con Factura.com" },
      { status: 500 }
    );
  }
}
