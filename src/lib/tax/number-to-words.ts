// src/lib/tax/number-to-words.ts
// Convierte importes numéricos a su representación oficial en texto para CFDI (Pesos M.N.)

const UNIDADES = [
  "",
  "un",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
];

const DECENAS_ESPECIALES = [
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
];

const DECENAS = [
  "",
  "diez",
  "veinte",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
];

const CENTENAS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];

function seccion(num: number, divisor: number, singular: string, plural: string): string {
  const cientos = Math.floor(num / divisor);
  const resto = num - cientos * divisor;

  let letras = "";
  if (cientos > 0) {
    if (cientos > 1) {
      letras = `${centenas(cientos)} ${plural}`;
    } else {
      letras = singular;
    }
  }

  if (resto > 0) {
    letras += "";
  }
  return letras;
}

function centenas(num: number): string {
  if (num === 100) return "cien";
  const c = Math.floor(num / 100);
  const d = num % 100;

  let str = CENTENAS[c];
  if (d > 0) {
    if (str) str += " ";
    str += decenas(d);
  }
  return str;
}

function decenas(num: number): string {
  if (num < 10) return UNIDADES[num];
  if (num >= 10 && num < 20) return DECENAS_ESPECIALES[num - 10];
  if (num === 20) return "veinte";
  if (num > 20 && num < 30) {
    const u = num % 10;
    return `veinti${UNIDADES[u]}`;
  }

  const d = Math.floor(num / 10);
  const u = num % 10;
  if (u === 0) return DECENAS[d];
  return `${DECENAS[d]} y ${UNIDADES[u]}`;
}

export function numeroALetras(monto: number): string {
  if (monto === 0) return "Cero pesos 00/100 M.N.";

  const partes = monto.toFixed(2).split(".");
  const entero = parseInt(partes[0], 10);
  const centavos = partes[1] || "00";

  let resultado = "";

  if (entero === 0) {
    resultado = "cero";
  } else if (entero >= 1000000000) {
    // Miles de millones
    const milesMillones = Math.floor(entero / 1000000000);
    const resto = entero % 1000000000;
    resultado = `${seccion(milesMillones, 1, "un mil", "mil")} millones`;
    if (resto > 0) resultado += ` ${numeroALetrasSimple(resto)}`;
  } else if (entero >= 1000000) {
    // Millones
    const millones = Math.floor(entero / 1000000);
    const resto = entero % 1000000;
    resultado = seccion(millones, 1, "un millón", "millones");
    if (resto > 0) resultado += ` ${numeroALetrasSimple(resto)}`;
  } else {
    resultado = numeroALetrasSimple(entero);
  }

  // Capitalizar primera letra
  const finalTexto =
    resultado.charAt(0).toUpperCase() +
    resultado.slice(1).trim() +
    ` pesos ${centavos}/100 M.N.`;

  return finalTexto;
}

function numeroALetrasSimple(num: number): string {
  if (num === 0) return "";
  if (num < 1000) return centenas(num);

  const miles = Math.floor(num / 1000);
  const resto = num % 1000;

  let strMiles = "";
  if (miles === 1) {
    strMiles = "mil";
  } else {
    strMiles = `${centenas(miles)} mil`;
  }

  if (resto > 0) {
    strMiles += ` ${centenas(resto)}`;
  }

  return strMiles;
}

