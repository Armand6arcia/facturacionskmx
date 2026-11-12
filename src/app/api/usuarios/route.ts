import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureTablesExist } from "@/lib/db-init";
import { hashPassword } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ensureTablesExist();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    const where: any = {};
    if (query) {
      where.OR = [
        { nombre: { contains: query } },
        { correo: { contains: query } },
        { usuario: { contains: query } },
      ];
    }

    const usuarios = await prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        usuario: true,
        correo: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ usuarios });
  } catch (error: any) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json(
      { error: error?.message || "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTablesExist();

    const body = await req.json();
    const { nombre, usuario, correo, password, rol, activo } = body;

    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      return NextResponse.json(
        { error: "El nombre completo es obligatorio." },
        { status: 400 }
      );
    }

    if (!correo || typeof correo !== "string" || !correo.includes("@")) {
      return NextResponse.json(
        { error: "Debes proporcionar un correo electrónico válido." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const cleanCorreo = correo.trim().toLowerCase();
    const cleanUsuario = (usuario && typeof usuario === "string" && usuario.trim())
      ? usuario.trim().toLowerCase()
      : cleanCorreo.split("@")[0].replace(/[^a-z0-9_.-]/g, "");

    // Validar si el correo ya existe
    const correoExistente = await prisma.usuario.findUnique({
      where: { correo: cleanCorreo },
    });

    if (correoExistente) {
      return NextResponse.json(
        { error: `El correo "${cleanCorreo}" ya está registrado en el sistema.` },
        { status: 409 }
      );
    }

    // Validar si el usuario ya existe
    if (cleanUsuario) {
      const userExistente = await prisma.usuario.findUnique({
        where: { usuario: cleanUsuario },
      });
      if (userExistente) {
        return NextResponse.json(
          { error: `El nombre de usuario "${cleanUsuario}" ya está en uso. Elige otro.` },
          { status: 409 }
        );
      }
    }

    const hashedPassword = hashPassword(password);

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        usuario: cleanUsuario,
        correo: cleanCorreo,
        password: hashedPassword,
        rol: rol || "ADMIN",
        activo: activo !== undefined ? Boolean(activo) : true,
      },
      select: {
        id: true,
        nombre: true,
        usuario: true,
        correo: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, usuario: nuevoUsuario }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { error: error?.message || "Error al crear usuario" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await ensureTablesExist();

    const body = await req.json();
    const { id, nombre, usuario, correo, password, rol, activo } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "El ID del usuario es obligatorio para actualizar." },
        { status: 400 }
      );
    }

    const usuarioActual = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioActual) {
      return NextResponse.json(
        { error: "El usuario no existe." },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (nombre && typeof nombre === "string") {
      updateData.nombre = nombre.trim();
    }

    if (usuario !== undefined && typeof usuario === "string") {
      const cleanUsuario = usuario.trim().toLowerCase();
      if (cleanUsuario && cleanUsuario !== usuarioActual.usuario) {
        const existeOtroUser = await prisma.usuario.findUnique({
          where: { usuario: cleanUsuario },
        });
        if (existeOtroUser) {
          return NextResponse.json(
            { error: `El nombre de usuario "${cleanUsuario}" ya está en uso.` },
            { status: 409 }
          );
        }
        updateData.usuario = cleanUsuario;
      }
    }

    if (correo && typeof correo === "string") {
      const cleanCorreo = correo.trim().toLowerCase();
      if (cleanCorreo !== usuarioActual.correo) {
        const existeOtro = await prisma.usuario.findUnique({
          where: { correo: cleanCorreo },
        });
        if (existeOtro) {
          return NextResponse.json(
            { error: `El correo "${cleanCorreo}" ya pertenece a otro usuario.` },
            { status: 409 }
          );
        }
        updateData.correo = cleanCorreo;
      }
    }

    if (password && typeof password === "string" && password.trim() !== "") {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "La nueva contraseña debe tener al menos 6 caracteres." },
          { status: 400 }
        );
      }
      updateData.password = hashPassword(password);
    }

    if (rol && typeof rol === "string") {
      updateData.rol = rol;
    }

    if (activo !== undefined) {
      updateData.activo = Boolean(activo);
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nombre: true,
        usuario: true,
        correo: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, usuario: usuarioActualizado });
  } catch (error: any) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { error: error?.message || "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTablesExist();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Se requiere el ID del usuario a eliminar." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "El usuario a eliminar no fue encontrado." },
        { status: 404 }
      );
    }

    const totalUsuarios = await prisma.usuario.count();
    if (totalUsuarios <= 1) {
      return NextResponse.json(
        { error: "No es posible eliminar el único usuario del sistema." },
        { status: 400 }
      );
    }

    await prisma.usuario.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Usuario eliminado exitosamente." });
  } catch (error: any) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json(
      { error: error?.message || "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}
