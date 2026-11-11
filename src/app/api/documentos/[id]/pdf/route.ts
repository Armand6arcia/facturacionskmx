import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FacturaComPacClient } from "@/lib/pac/factura-com";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await prisma.documento.findUnique({
      where: { id: params.id },
      include: { timbre: true },
    });

    if (!doc || !doc.timbre) {
      return NextResponse.json(
        { error: "El documento no cuenta con CFDI timbrado." },
        { status: 404 }
      );
    }

    const hasFacturaKeys = Boolean(
      process.env.FACTURA_COM_API_KEY || process.env.FACTURACOM_API_KEY
    );

    if (hasFacturaKeys && doc.timbre.uuid) {
      try {
        const client = new FacturaComPacClient();
        const pdfData = await client.obtenerPdf(doc.timbre.uuid);

        if (pdfData.startsWith("http")) {
          return NextResponse.redirect(pdfData);
        }

        const buffer = Buffer.from(pdfData, "base64");
        const filename = `Factura_${doc.serie || "F"}_${doc.folio || "1"}_${doc.timbre.uuid}.pdf`;

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      } catch (pacErr: any) {
        console.warn("Factura.com PDF direct fetch fallback:", pacErr.message);
      }
    }

    // Si es demo o no se pudo descargar directo de la API externa, redirigir a la vista web imprimible
    return NextResponse.redirect(new URL(`/factura/${doc.id}`, req.url));
  } catch (error: any) {
    console.error("Error al obtener PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Error al obtener PDF" },
      { status: 500 }
    );
  }
}

