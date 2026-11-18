import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FacturaComPacClient } from "@/lib/pac/factura-com";
import { ensureTablesExist } from "@/lib/db-init";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Blindaje de seguridad: Deshabilitado para evitar sobreescritura accidental masiva en Factura.com
  return NextResponse.json(
    {
      success: false,
      error:
        "La sincronización masiva hacia Factura.com ha sido deshabilitada por protección. Las modificaciones deben realizarse de forma individual y manual por cliente.",
    },
    { status: 403 }
  );
}

