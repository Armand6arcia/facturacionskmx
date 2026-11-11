// src/lib/parsers/csf-parser.ts
// Extractor inteligente de Constancia de Situación Fiscal (SAT México) para CFDI 4.0

export interface CsfParsedData {
  rfc: string;
  razonSocial: string;
  codigoPostal: string;
  regimenFiscal: string;
  regimenFiscalDesc?: string;
  usoCfdiSugerido: string;
  tipoPersona: "MORAL" | "FISICA";
  curp?: string;
  rawText?: string;
}

// Catálogo de regímenes SAT principales
const REGIMENES_SAT: { code: string; desc: string; regex: RegExp }[] = [
  { code: "601", desc: "General de Ley Personas Morales", regex: /general\s+de\s+ley\s+personas\s+morales/i },
  { code: "603", desc: "Personas Morales con Fines no Lucrativos", regex: /fines\s+no\s+lucrativos/i },
  { code: "605", desc: "Sueldos y Salarios e Ingresos Asimilados a Salarios", regex: /sueldos\s+y\s+salarios/i },
  { code: "606", desc: "Arrendamiento", regex: /arrendamiento/i },
  { code: "608", desc: "Demás ingresos", regex: /dem[aá]s\s+ingresos/i },
  { code: "610", desc: "Residentes en el Extranjero sin Establecimiento Permanente en México", regex: /residentes\s+en\s+el\s+extranjero/i },
  { code: "611", desc: "Ingresos por Dividendos (socios y accionistas)", regex: /dividendos/i },
  { code: "612", desc: "Personas Físicas con Actividades Empresariales y Profesionales", regex: /actividades\s+empresariales\s+y\s+profesionales/i },
  { code: "614", desc: "Ingresos por intereses", regex: /intereses/i },
  { code: "615", desc: "Régimen de los ingresos por obtención de premios", regex: /obtenci[oó]n\s+de\s+premios/i },
  { code: "616", desc: "Sin obligaciones fiscales", regex: /sin\s+obligaciones\s+fiscales/i },
  { code: "620", desc: "Sociedades Cooperativas de Producción que optan por diferir sus ingresos", regex: /sociedades\s+cooperativas/i },
  { code: "621", desc: "Incorporación Fiscal", regex: /incorporaci[oó]n\s+fiscal/i },
  { code: "622", desc: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras", regex: /agr[ií]colas|ganaderas|pesqueras/i },
  { code: "623", desc: "Opcional para Grupos de Sociedades", regex: /grupos\s+de\s+sociedades/i },
  { code: "624", desc: "Coordinados", regex: /coordinados/i },
  { code: "625", desc: "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas", regex: /plataformas\s+tecnol[oó]gicas/i },
  { code: "626", desc: "Régimen Simplificado de Confianza", regex: /simplificado\s+de\s+confianza/i },
];

/**
 * CFDI 4.0 exige que el nombre de la Persona Moral NO contenga el régimen societario.
 * (e.g. "S.A. DE C.V.", "S DE RL DE CV", "S.A.P.I. DE C.V.", etc.)
 */
export function limpiarRazonSocialCfdi40(nombre: string): string {
  if (!nombre) return "";

  let limpio = nombre.trim();

  // Expresiones de tipos de sociedad mexicana habituales al final o entre comas
  const regexSociedades = [
    /,\s*S\.?\s*A\.?\s*P\.?\s*I\.?\s*DE\s*C\.?\s*V\.?$/i,
    /\s+S\.?\s*A\.?\s*P\.?\s*I\.?\s*DE\s*C\.?\s*V\.?$/i,
    /,\s*S\.?\s*A\.?\s*P\.?\s*I\.?$/i,
    /\s+S\.?\s*A\.?\s*P\.?\s*I\.?$/i,
    /,\s*S\.?\s*DE\s*R\.?\s*L\.?\s*DE\s*C\.?\s*V\.?$/i,
    /\s+S\.?\s*DE\s*R\.?\s*L\.?\s*DE\s*C\.?\s*V\.?$/i,
    /,\s*S\.?\s*A\.?\s*DE\s*C\.?\s*V\.?$/i,
    /\s+S\.?\s*A\.?\s*DE\s*C\.?\s*V\.?$/i,
    /,\s*S\.?\s*A\.?\s*S\.?$/i,
    /\s+S\.?\s*A\.?\s*S\.?$/i,
    /,\s*S\.?\s*C\.?$/i,
    /\s+S\.?\s*C\.?$/i,
    /,\s*A\.?\s*C\.?$/i,
    /\s+A\.?\s*C\.?$/i,
    /,\s*S\.?\s*A\.?$/i,
    /\s+S\.?\s*A\.?$/i,
    /,\s*S\.?\s*N\.?\s*C\.?$/i,
    /\s+S\.?\s*N\.?\s*C\.?$/i,
    /,\s*S\.?\s*C\.?\s*S\.?$/i,
    /\s+S\.?\s*C\.?\s*S\.?$/i,
    /,\s*S\.?\s*EN\s*C\.?$/i,
    /\s+S\.?\s*EN\s*C\.?$/i,
  ];

  for (const regex of regexSociedades) {
    limpio = limpio.replace(regex, "");
  }

  // Limpiar caracteres remanentes como comas o puntos al final
  limpio = limpio.replace(/[,.-]+$/, "").trim();

  // Espacios dobles
  limpio = limpio.replace(/\s+/g, " ");

  return limpio.toUpperCase();
}

/**
 * Extrae texto de un Buffer PDF de forma segura
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfModule = require("pdf-parse");

    // Soporta pdf-parse v2 (clase PDFParse) y v1 (función por defecto)
    if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      await parser.load();
      const result = await parser.getText();
      const text = result?.text || "";
      await parser.destroy();
      return text;
    }

    if (typeof pdfModule === "function") {
      const data = await pdfModule(buffer);
      return data?.text || "";
    }

    throw new Error("Formato de librería pdf-parse no compatible");
  } catch (error: any) {
    throw new Error(`No se pudo leer el archivo PDF: ${error.message}`);
  }
}

/**
 * Parsea el texto extraído de la Constancia de Situación Fiscal
 */
export function parseCsfText(text: string): CsfParsedData {
  if (!text || text.length < 20) {
    throw new Error("El documento no contiene texto legible o es una imagen escaneada sin OCR.");
  }

  // 1. Extraer RFC
  // Formato: 3 letras (Moral) o 4 letras (Física), 6 dígitos (AAMMDD), 3 alfanuméricos (homoclave)
  let rfc = "";
  const rfcMatchExplicit = text.match(/RFC:\s*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i);
  if (rfcMatchExplicit) {
    rfc = rfcMatchExplicit[1].toUpperCase();
  } else {
    const rfcMatches = text.match(/\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/g);
    if (rfcMatches && rfcMatches.length > 0) {
      rfc = rfcMatches[0].toUpperCase();
    }
  }

  if (!rfc) {
    throw new Error("No se encontró ningún RFC válido en la Constancia.");
  }

  const tipoPersona: "MORAL" | "FISICA" = rfc.length === 12 ? "MORAL" : "FISICA";

  // 2. Extraer Razón Social o Nombre
  let razonSocial = "";

  if (tipoPersona === "MORAL") {
    // Buscar Denominación/Razón Social:
    const pmMatch = text.match(/Denominaci[oó]n\/Raz[oó]n\s*Social:\s*([^\n\r]+)/i);
    if (pmMatch && pmMatch[1]) {
      razonSocial = limpiarRazonSocialCfdi40(pmMatch[1]);
    }
  }

  // Si no se encontró como moral o es física, buscar nombres por campos
  if (!razonSocial) {
    const nombreMatch = text.match(/Nombre\s*\(s\):\s*([^\n\r]+)/i);
    const primerApMatch = text.match(/Primer\s*Apellido:\s*([^\n\r]+)/i);
    const segundoApMatch = text.match(/Segundo\s*Apellido:\s*([^\n\r]+)/i);

    const nombre = nombreMatch ? nombreMatch[1].trim() : "";
    const primerAp = primerApMatch ? primerApMatch[1].trim() : "";
    const segundoAp = segundoApMatch ? segundoApMatch[1].trim() : "";

    const partes = [nombre, primerAp, segundoAp].filter(Boolean);
    if (partes.length > 0) {
      razonSocial = partes.join(" ").toUpperCase().trim();
    }
  }

  // Fallback si la estructura es diferente: buscar bloque de identificación
  if (!razonSocial) {
    const backupMatch = text.match(/Raz[oó]n\s*Social:\s*([^\n\r]+)/i);
    if (backupMatch) {
      razonSocial = limpiarRazonSocialCfdi40(backupMatch[1]);
    }
  }

  // 3. Extraer Código Postal
  let codigoPostal = "";
  const cpMatch = text.match(/C[oó]digo\s*Postal:\s*(\d{5})/i);
  if (cpMatch && cpMatch[1]) {
    codigoPostal = cpMatch[1];
  } else {
    // Buscar CP en bloque de domicilio
    const cpBlockMatch = text.match(/\bCP:?\s*(\d{5})\b/i);
    if (cpBlockMatch) {
      codigoPostal = cpBlockMatch[1];
    }
  }

  // 4. Extraer Régimen Fiscal
  let regimenFiscal = tipoPersona === "MORAL" ? "601" : "612"; // Default
  let regimenFiscalDesc = "";

  // Primero buscar si viene explícito con 3 dígitos (ej. "601 - General" o "Régimen: 626")
  const numericRegimenMatch = text.match(/R[eé]gimen(?:\s*Fiscal)?:\s*(6\d{2})\b/i);
  if (numericRegimenMatch && numericRegimenMatch[1]) {
    regimenFiscal = numericRegimenMatch[1];
    const found = REGIMENES_SAT.find((r) => r.code === regimenFiscal);
    if (found) regimenFiscalDesc = found.desc;
  } else {
    // Buscar por texto en la sección de Regímenes
    for (const r of REGIMENES_SAT) {
      if (r.regex.test(text)) {
        regimenFiscal = r.code;
        regimenFiscalDesc = r.desc;
        break;
      }
    }
  }

  // 5. Sugerir Uso de CFDI
  let usoCfdiSugerido = "G03"; // Gastos en general
  if (regimenFiscal === "605" || regimenFiscal === "616") {
    usoCfdiSugerido = "S01"; // Sin efectos fiscales
  } else if (regimenFiscal === "606") {
    usoCfdiSugerido = "G03";
  }

  // 6. CURP opcional para persona física
  let curp: string | undefined;
  if (tipoPersona === "FISICA") {
    const curpMatch = text.match(/\b([A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d)\b/i);
    if (curpMatch) {
      curp = curpMatch[1].toUpperCase();
    }
  }

  return {
    rfc,
    razonSocial: razonSocial || (tipoPersona === "MORAL" ? "EMPRESA SIN NOMBRE" : "CONTRIBUYENTE"),
    codigoPostal: codigoPostal || "00000",
    regimenFiscal,
    regimenFiscalDesc,
    usoCfdiSugerido,
    tipoPersona,
    curp,
  };
}

/**
 * Función principal que recibe el buffer de un archivo PDF y retorna los datos fiscales
 */
export async function parseCsfPdf(buffer: Buffer): Promise<CsfParsedData> {
  const text = await extractTextFromPdf(buffer);
  const data = parseCsfText(text);
  data.rawText = text.slice(0, 500); // Primeros 500 caracteres para diagnóstico si se necesita
  return data;
}
