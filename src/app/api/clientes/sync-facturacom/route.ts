import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FacturaComPacClient } from "@/lib/pac/factura-com";
import { limpiarRazonSocialCfdi40 } from "@/lib/parsers/csf-parser";
import { ensureTablesExist } from "@/lib/db-init";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureTablesExist();

    const { searchParams } = new URL(req.url);
    const empresaIdParam = searchParams.get("empresaId") || req.cookies.get("sk_active_empresa_id")?.value;

    let empresa = null;
    if (empresaIdParam) {
      empresa = await prisma.empresa.findUnique({ where: { id: empresaIdParam } });
    }
    if (!empresa) {
      empresa = await prisma.empresa.findFirst({ where: { activa: true }, orderBy: { createdAt: "asc" } });
    }

    const pac = new FacturaComPacClient({
      apiKey: empresa?.apiKey,
      secretKey: empresa?.secretKey,
      environment: empresa?.ambiente,
    });
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

      const incomingCp = String(
        raw.codpos ||
        raw.codigo_postal ||
        raw.postal_code ||
        raw.cp ||
        ""
      ).trim();
      const codigoPostal = incomingCp || "06600";

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
      const rawEmail = (raw.email || raw.correo || "").trim() || null;

      // Verificar si ya existe en esta empresa
      const existente = await prisma.cliente.findFirst({
        where: {
          rfc,
          ...(empresa ? { empresaId: empresa.id } : {}),
        },
      });

      try {
        if (existente) {
          // Preservar código postal si el cliente ya tiene uno corregido (distinto a 06600)
          const cpFinal =
            existente.codigoPostal && existente.codigoPostal !== "06600"
              ? existente.codigoPostal
              : (incomingCp || existente.codigoPostal || "06600");

          await prisma.cliente.update({
            where: { id: existente.id },
            data: {
              razonSocial: razonSocial || existente.razonSocial,
              codigoPostal: cpFinal,
              regimenFiscal: regimenFiscal || existente.regimenFiscal,
              usoCfdiDefault: usoCfdiDefault || existente.usoCfdiDefault,
              email: existente.email || rawEmail,
              numRegIdTrib: numRegIdTrib || existente.numRegIdTrib,
              empresaId: empresa ? empresa.id : existente.empresaId,
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
              email: rawEmail,
              numRegIdTrib,
              pais: "MEX",
              empresaId: empresa?.id || null,
            },
          });
          nuevos++;
        }
      } catch (clientErr: any) {
        console.warn(`[SyncFacturaCom] Fallo inserción directa para RFC ${rfc}: ${clientErr?.message}. Intentando fallback.`);
        try {
          const fallbackExistente = await prisma.cliente.findFirst({
            where: { rfc },
          });
          if (fallbackExistente) {
            const fallbackCp =
              fallbackExistente.codigoPostal && fallbackExistente.codigoPostal !== "06600"
                ? fallbackExistente.codigoPostal
                : (incomingCp || fallbackExistente.codigoPostal || "06600");

            await prisma.cliente.update({
              where: { id: fallbackExistente.id },
              data: {
                razonSocial: razonSocial || fallbackExistente.razonSocial,
                codigoPostal: fallbackCp,
                regimenFiscal: regimenFiscal || fallbackExistente.regimenFiscal,
                usoCfdiDefault: usoCfdiDefault || fallbackExistente.usoCfdiDefault,
                email: fallbackExistente.email || rawEmail,
                empresaId: empresa ? empresa.id : fallbackExistente.empresaId,
              },
            });
            actualizados++;
          }
        } catch (innerErr: any) {
          console.warn(`[SyncFacturaCom] No se pudo procesar cliente RFC ${rfc}:`, innerErr?.message);
        }
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

