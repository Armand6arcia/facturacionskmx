import { detectFormat } from "./detector";
import { parseHtmlXls } from "./html-parser";
import { parseBinaryXls } from "./binary-parser";
import { ParsedDocument } from "./types";

export function parseDocument(buffer: Buffer, filename: string): ParsedDocument {
  const format = detectFormat(buffer);

  if (format === "HTML_XLS") {
    return parseHtmlXls(buffer, filename);
  }

  if (format === "BINARY_XLS") {
    return parseBinaryXls(buffer, filename);
  }

  // If unknown, try HTML first, then binary
  try {
    return parseHtmlXls(buffer, filename);
  } catch (e) {
    return parseBinaryXls(buffer, filename);
  }
}

export * from "./types";
export * from "./detector";
export * from "./format-description";

