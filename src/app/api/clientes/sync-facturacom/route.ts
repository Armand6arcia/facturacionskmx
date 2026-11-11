import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FacturaComPacClient } from "@/lib/pac/factura-com";
import { limpiarRazonSocialCfdi40 } from "@/lib/parsers/csf-parser";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const pac = new FacturaComPacClient();
    const clientesFactura = await pac.obtenerClientes();

    if (!Array.isArray(clientesFactura)) {
      return NextResponse.json(
        {
          success: false,
          error: "Factura.com no devolvió una lista válida de clientes.",
        },
        { status: 502 }
      );
    }

    let nuevos = 0;
    let actualizados = 0;

    for (const raw of clientesFactura) {
      const rfc = (raw.rfc || raw.Rfc || raw.RFC || "").trim().toUpperCase();
      if (!rfc) continue;

      let razonSocial = (
        raw.razons ||
        raw.razon_social ||
        raw.legal_name ||
        raw.nombre ||
        raw.RazonSocial ||
        ""
      ).trim();

      // Limpiar razón social para CFDI 4.0 si es persona moral
      if (rfc.length === 12) {
        razonSocial = limpiarRazonSocialCfdi40(razonSocial);
      } else {
        razonSocial = razonSocial.toUpperCase();
      }

      const codigoPostal = String(
        raw.codpos ||
        raw.codigo_postal ||
        raw.postal_code ||
        raw.cp ||
        "06600"
      ).trim();

      const regimenFiscal = String(
        raw.regimen ||
        raw.tax_regime ||
        raw.regimen_fiscal ||
        raw.tax_system ||
        (rfc.length === 12 ? "601" : "612")
      ).trim();

      const usoCfdiDefault = String(
        raw.cfdi_use ||
        raw.uso_cfdi ||
        raw.usoCfdi ||
        "G03"
      ).trim();

      const numRegIdTrib = raw.numregidtrib || raw.tax_id || null;

      // Verificar si ya existe
      const existente = await prisma.cliente.findUnique({
        where: { rfc },
      });

      if (existente) {
        await prisma.cliente.update({
          where: { rfc },
          data: {
            razonSocial: razonSocial || existente.razonSocial,
            codigoPostal: codigoPostal || existente.codigoPostal,
            regimenFiscal: regimenFiscal || existente.regimenFiscal,
            usoCfdiDefault: usoCfdiDefault || existente.usoCfdiDefault,
            numRegIdTrib: numRegIdTrib || existente.numRegIdTrib,
          },
        });
        actualizados++;
      } else {
        await prisma.cliente.create({
          data: {
            rfc,
            razonSocial: razonSocial || "CLIENTE FACTURA.COM",
            codigoPostal: codigoPostal || "06600",
            regimenFiscal: regimenFiscal || "601",
            usoCfdiDefault: usoCfdiDefault || "G03",
            numRegIdTrib,
            pais: "MEX",
          },
        });
        nuevos++;
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: `Sincronización completada: ${nuevos} cliente(s) nuevo(s), ${actualizados} actualizado(s).`,
      totalProcesados: clientesFactura.length,
      nuevos,
      actualizados,
    });
  } catch (error: any) {
    console.error("Error al sincronizar clientes desde Factura.com:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Error al sincronizar clientes con los servidores de Factura.com.",
      },
      { status: 500 }
    );
  }
}
