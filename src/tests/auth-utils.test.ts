import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../lib/auth-utils";

describe("auth-utils (Password hashing & verification)", () => {
  it("debe generar un hash con formato salt:hash", () => {
    const hash = hashPassword("Admin123!");
    expect(hash).toContain(":");
    const [salt, key] = hash.split(":");
    expect(salt).toHaveLength(32); // 16 bytes hex
    expect(key).toHaveLength(128); // 64 bytes hex
  });

  it("debe verificar correctamente una contraseña válida", () => {
    const pwd = "SuperClaveSecreta.2026";
    const hash = hashPassword(pwd);
    expect(verifyPassword(pwd, hash)).toBe(true);
  });

  it("debe rechazar una contraseña incorrecta", () => {
    const hash = hashPassword("MiPasswordCorrecto");
    expect(verifyPassword("PasswordIncorrecto", hash)).toBe(false);
  });

  it("debe generar sales distintas para la misma contraseña", () => {
    const hash1 = hashPassword("MismaClave");
    const hash2 = hashPassword("MismaClave");
    expect(hash1).not.toBe(hash2);
    expect(verifyPassword("MismaClave", hash1)).toBe(true);
    expect(verifyPassword("MismaClave", hash2)).toBe(true);
  });

  it("debe retornar false con entradas inválidas o malformadas", () => {
    expect(verifyPassword("", "invalido")).toBe(false);
    expect(verifyPassword("clave", "")).toBe(false);
    expect(verifyPassword("clave", "sin-dos-puntos")).toBe(false);
  });
});

