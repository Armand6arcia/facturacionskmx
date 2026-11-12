import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureTablesExist } from "@/lib/db-init";
import { verifyPassword } from "@/lib/auth-utils";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureTablesExist();

    const body = await req.json();
    const { identificador, password } = body;

    if (!identificador || typeof identificador !== "string" || !identificador.trim()) {
      return NextResponse.json(
        { error: "Ingresa tu usuario o correo electrónico." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || !password.trim()) {
      return NextResponse.json(
        { error: "Ingresa tu contraseña." },
        { status: 400 }
      );
    }

    const cleanInput = identificador.trim().toLowerCase();

    // Buscar por usuario o correo
    const usuarioEncontrado = await prisma.usuario.findFirst({
      where: {
        OR: [
          { correo: cleanInput },
          { usuario: cleanInput },
        ],
      },
    });

    if (!usuarioEncontrado) {
      return NextResponse.json(
        { error: "Credenciales inválidas. Verifica tu usuario o contraseña." },
        { status: 401 }
      );
    }

    if (!usuarioEncontrado.activo) {
      return NextResponse.json(
        { error: "Tu cuenta de usuario ha sido desactivada. Consulta con el administrador." },
        { status: 403 }
      );
    }

    const esValida = verifyPassword(password, usuarioEncontrado.password);
    if (!esValida) {
      return NextResponse.json(
        { error: "Credenciales inválidas. Verifica tu usuario o contraseña." },
        { status: 401 }
      );
    }

    // Generar token de sesión
    const sessionUser = {
      id: usuarioEncontrado.id,
      nombre: usuarioEncontrado.nombre,
      usuario: usuarioEncontrado.usuario || undefined,
      correo: usuarioEncontrado.correo,
      rol: usuarioEncontrado.rol,
    };

    const token = await createSessionToken(sessionUser, 24 * 7); // 7 días

    const response = NextResponse.json({
      success: true,
      message: `Bienvenido, ${usuarioEncontrado.nombre}`,
      user: sessionUser,
    });

    // Fijar cookie HTTP-Only segura
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 días en segundos
    });

    return response;
  } catch (error: any) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: error?.message || "Ocurrió un error al procesar el inicio de sesión." },
      { status: 500 }
    );
  }
}

