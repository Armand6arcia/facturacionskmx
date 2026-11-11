import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || "";

  if (!dbUrl) {
    return NextResponse.json(
      {
        success: false,
        error: "No se encontró la variable DATABASE_URL en las Variables de Entorno de Hostinger.",
        solucion: "Agrega DATABASE_URL en las variables de entorno de Hostinger con el formato: mysql://USUARIO:PASSWORD@127.0.0.1:3306/BASE_DE_DATOS",
      },
      { status: 500 }
    );
  }

  // Ocultar contraseña en el reporte de diagnóstico
  const maskedUrl = dbUrl.replace(/:\/\/(.*?):(.*?)@/, "://$1:******@");

  try {
    // 1. Probar autenticación directa contra MySQL
    await prisma.$connect();

    // 2. Sincronizar tablas (db push) y cargar catálogo inicial si no se ha hecho
    let dbPushOutput = "";
    try {
      dbPushOutput = execSync("npx prisma db push --skip-generate", {
        encoding: "utf-8",
        stdio: "pipe",
      });
      execSync("npx tsx prisma/seed.ts", {
        encoding: "utf-8",
        stdio: "pipe",
      });
    } catch (pushErr: any) {
      console.warn("Aviso en db push/seed:", pushErr?.message);
    }

    const [totalClientes, totalProductos] = await Promise.all([
      prisma.cliente.count().catch(() => 0),
      prisma.productoSat.count().catch(() => 0),
    ]);

    return NextResponse.json({
      success: true,
      mensaje: "¡Conexión a MySQL en Hostinger exitosa y tablas sincronizadas!",
      connection: maskedUrl,
      tablas: {
        totalClientes,
        totalProductosSat: totalProductos,
      },
      dbPushOutput: dbPushOutput.slice(0, 300),
    });
  } catch (error: any) {
    console.error("Error al conectar con la base de datos:", error);

    const isAuthFailed = error.message.includes("Authentication failed");
    const isAccessDenied = error.message.includes("Access denied");
    const isConnRefused = error.message.includes("Can't reach database server");

    let diagnostico = "Error desconocido de base de datos.";
    let solucion = "Verifica los datos en Hostinger.";

    if (isAuthFailed || isAccessDenied) {
      diagnostico =
        "MySQL rechazó el usuario o contraseña. Las credenciales no coinciden con las registradas en Hostinger.";
      solucion =
        "1) Si tu contraseña contiene caracteres especiales (#, @, !, $, %), debes reemplazarlos por una contraseña solo con letras y números en Hostinger, o codificarlos en formato URL (ej. '#' es '%23', '@' es '%40').\n2) En Hostinger ve a Bases de datos MySQL y verifica la contraseña del usuario.";
    } else if (isConnRefused) {
      diagnostico =
        "No se pudo conectar al puerto 3306 de MySQL en 127.0.0.1.";
      solucion =
        "En Hostinger verifica si el host de tu base de datos es 'localhost', '127.0.0.1' o una IP específica indicada en el panel de Bases de Datos.";
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        connection: maskedUrl,
        diagnostico,
        solucion,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
