import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "../lib/session";

describe("session (Token creation & verification with Web Crypto)", () => {
  const mockUser = {
    id: "usr_12345",
    nombre: "Juan Pérez",
    usuario: "jperez",
    correo: "jperez@stylekorean.mx",
    rol: "ADMIN",
  };

  it("debe crear y verificar un token de sesión exitosamente", async () => {
    const token = await createSessionToken(mockUser);
    expect(token).toBeDefined();
    expect(token.split(".")).toHaveLength(3);

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(mockUser.id);
    expect(verified?.nombre).toBe(mockUser.nombre);
    expect(verified?.usuario).toBe(mockUser.usuario);
    expect(verified?.correo).toBe(mockUser.correo);
    expect(verified?.rol).toBe(mockUser.rol);
  });

  it("debe rechazar un token alterado o con firma incorrecta", async () => {
    const token = await createSessionToken(mockUser);
    const alteredToken = token.slice(0, -5) + "abcde";
    const verified = await verifySessionToken(alteredToken);
    expect(verified).toBeNull();
  });

  it("debe rechazar tokens expirados", async () => {
    // Expirar hace 1 hora
    const token = await createSessionToken(mockUser, -1);
    const verified = await verifySessionToken(token);
    expect(verified).toBeNull();
  });

  it("debe retornar null para valores vacíos o malformados", async () => {
    expect(await verifySessionToken("")).toBeNull();
    expect(await verifySessionToken("invalido")).toBeNull();
    expect(await verifySessionToken("a.b")).toBeNull();
  });
});

