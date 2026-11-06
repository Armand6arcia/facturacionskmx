import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const file = searchParams.get("file") || "IN00491311.xls";

    const allowed = ["IN00491311.xls", "InvoiceIntg.xls"];
    if (!allowed.includes(file)) {
      return NextResponse.json({ error: "Archivo no permitido" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "samples", file);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Archivo de muestra no encontrado" }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": file.endsWith(".xls") ? "application/vnd.ms-excel" : "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error al leer archivo" }, { status: 500 });
  }
}

