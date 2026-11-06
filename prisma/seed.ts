import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { formatInvoiceDescription } from "../src/lib/parsers/format-description";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de datos...");

  // 1. Clientes iniciales
  const clientes = [
    {
      rfc: "EKU9003173C9",
      razonSocial: "KOCARE BEAUTY S.A. DE C.V.",
      codigoPostal: "06600",
      regimenFiscal: "601", // General de Ley Personas Morales
      usoCfdiDefault: "G03", // Gastos en general
      pais: "MEX",
      esExtranjero: false,
    },
    {
      rfc: "FBM180425AA1",
      razonSocial: "FARMACIAS Y BELLEZA DE MEXICO S.A. DE C.V.",
      codigoPostal: "64000",
      regimenFiscal: "601",
      usoCfdiDefault: "G03",
      pais: "MEX",
      esExtranjero: false,
    },
    {
      rfc: "DCC200914KL3",
      razonSocial: "DISTRIBUIDORA COSMETICA COREANA S. DE R.L. DE C.V.",
      codigoPostal: "44100",
      regimenFiscal: "601",
      usoCfdiDefault: "G03",
      pais: "MEX",
      esExtranjero: false,
    },
    {
      rfc: "TDN150312XX9",
      razonSocial: "TIENDAS DEPARTAMENTALES DEL NORTE S.A. DE C.V.",
      codigoPostal: "88200",
      regimenFiscal: "601",
      usoCfdiDefault: "G03",
      pais: "MEX",
      esExtranjero: false,
    },
    {
      rfc: "MOGM8803158V2",
      razonSocial: "MARIANA MORALES GARZA",
      codigoPostal: "03100",
      regimenFiscal: "612", // Personas Físicas con Actividades Empresariales y Profesionales
      usoCfdiDefault: "G03",
      pais: "MEX",
      esExtranjero: false,
    },
  ];

  for (const c of clientes) {
    await prisma.cliente.upsert({
      where: { rfc: c.rfc },
      update: c,
      create: c,
    });
  }
  console.log(`Clientes creados/actualizados: ${clientes.length}`);

  // 2. Plantillas Carta Porte
  const plantillas = [
    {
      nombre: "Ruta Naucalpan -> Guadalajara (Zapopan)",
      origen: "Av. Primero de Mayo 120, Naucalpan, Estado de México, C.P. 53500",
      destino: "Parque Industrial Belenes, Zapopan, Jalisco, C.P. 45150",
      distanciaKm: 535,
      vehiculo: "Camioneta Ford F-350 mod 2023",
      placas: "LC-88-921",
      operador: "Roberto Sánchez Mendoza",
      rfcOperador: "SAMR7906148K2",
    },
    {
      nombre: "Ruta Naucalpan -> Monterrey (Apodaca)",
      origen: "Av. Primero de Mayo 120, Naucalpan, Estado de México, C.P. 53500",
      destino: "Parque Industrial Monterrey, Apodaca, N.L., C.P. 66600",
      distanciaKm: 920,
      vehiculo: "Rabón Freightliner M2",
      placas: "54-AA-9K",
      operador: "Carlos Fuentes Luna",
      rfcOperador: "FULC821005PT9",
    },
  ];

  for (const p of plantillas) {
    const existing = await prisma.plantillaCartaPorte.findFirst({
      where: { nombre: p.nombre },
    });
    if (!existing) {
      await prisma.plantillaCartaPorte.create({ data: p });
    }
  }
  console.log(`Plantillas de Carta Porte registradas: ${plantillas.length}`);

  // 3. Productos SAT (18 mapeados y 7 sin mapear)
  const itemsFile = path.join(__dirname, "sample_items.json");
  if (fs.existsSync(itemsFile)) {
    const sampleItems = JSON.parse(fs.readFileSync(itemsFile, "utf8"));
    for (const item of sampleItems) {
      const formattedDesc = formatInvoiceDescription(item.brand, item.name);
      await prisma.productoSat.upsert({
        where: { sku: item.sku },
        update: {
          barcode: item.cleanBarcode,
          descripcion: formattedDesc,
          claveProdServ: item.mapped ? item.claveProdServ : null,
          claveUnidad: "H87",
          objetoImp: "02",
          tasaIVA: 0.16,
          hsCode: item.hsCode,
          esDemo: true,
        },
        create: {
          sku: item.sku,
          barcode: item.cleanBarcode,
          descripcion: formattedDesc,
          claveProdServ: item.mapped ? item.claveProdServ : null,
          claveUnidad: "H87",
          objetoImp: "02",
          tasaIVA: 0.16,
          hsCode: item.hsCode,
          esDemo: true,
        },
      });
    }
    console.log(`Productos en catálogo SAT: ${sampleItems.length} (18 mapeados, 7 sin mapear para demo)`);
  }

  console.log("Seed completado exitosamente.");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

