import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doc = await prisma.documento.findUnique({
      where: { id: params.id },
      include: { timbre: true },
    });

    if (!doc || !doc.timbre || !doc.timbre.xmlContent) {
      return NextResponse.json(
        { error: "El documento aún no cuenta con XML sellado por el PAC." },
        { status: 404 }
      );
    }

    const filename = `CFDI_4.0_${doc.serie || "F"}_${doc.folio || "1"}_${doc.timbre.uuid}.xml`;

    return new NextResponse(doc.timbre.xmlContent, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error al descargar XML:", error);
    return NextResponse.json(
      { error: error?.message || "Error al descargar XML" },
      { status: 500 }
    );
  }
}

