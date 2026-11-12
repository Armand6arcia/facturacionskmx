import crypto from "crypto";

/**
 * Hashea una contraseña usando scrypt con salt aleatorio.
 * Devuelve formato 'salt:hash'.
 */
export function hashPassword(password: string): string {
  if (!password || typeof password !== "string") {
    throw new Error("La contraseña debe ser una cadena válida");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Compara una contraseña en texto plano contra un hash 'salt:hash'.
 */
export function verifyPassword(password: string, combinedHash: string): boolean {
  if (!password || !combinedHash || typeof password !== "string" || typeof combinedHash !== "string") {
    return false;
  }
  const parts = combinedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, storedHash] = parts;
  try {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    const storedBuf = Buffer.from(storedHash, "hex");
    const calculatedBuf = Buffer.from(hash, "hex");
    if (storedBuf.length !== calculatedBuf.length) return false;
    return crypto.timingSafeEqual(storedBuf, calculatedBuf);
  } catch {
    return false;
  }
}

