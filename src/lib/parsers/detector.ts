import crypto from "crypto";

export type DetectedFormat = "HTML_XLS" | "BINARY_XLS" | "UNKNOWN";

export function detectFormat(buffer: Buffer): DetectedFormat {
  // Check OLE binary magic bytes: D0 CF 11 E0 A1 B1 1A E1
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    return "BINARY_XLS";
  }

  // Check ZIP / OOXML magic bytes: 50 4B 03 04
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return "BINARY_XLS";
  }

  // Check HTML text
  const head = buffer.subarray(0, 4096).toString("utf-8").toLowerCase();
  if (
    head.includes("<html") ||
    head.includes("<table") ||
    head.includes("<!doctype html") ||
    head.includes("<tr") ||
    head.includes("<th") ||
    head.includes("<td")
  ) {
    return "HTML_XLS";
  }

  return "UNKNOWN";
}

export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

