import { NextRequest, NextResponse } from "next/server";
import { parseCsfPdf } from "@/lib/parsers/csf-parser";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo de constancia." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "El archivo debe ser un documento PDF oficial del SAT (.pdf)." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const data = await parseCsfPdf(buffer);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error al procesar constancia fiscal:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "No se pudieron extraer los datos fiscales de la constancia. Asegúrate de subir el PDF original del SAT.",
      },
      { status: 422 }
    );
  }
}

