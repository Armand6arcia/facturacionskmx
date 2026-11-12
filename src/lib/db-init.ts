import { prisma } from "@/lib/prisma";

let tablesInitialized = false;

export async function ensureTablesExist() {
  if (tablesInitialized) return;

  try {
    // 1. Tabla Cliente
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Cliente (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        rfc VARCHAR(191) NOT NULL UNIQUE,
        razonSocial VARCHAR(191) NOT NULL,
        codigoPostal VARCHAR(191) NOT NULL,
        regimenFiscal VARCHAR(191) NOT NULL,
        usoCfdiDefault VARCHAR(191) NOT NULL,
        pais VARCHAR(191) NOT NULL DEFAULT 'MEX',
        numRegIdTrib VARCHAR(191) NULL,
        esExtranjero BOOLEAN NOT NULL DEFAULT FALSE,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Tabla ProductoSat
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ProductoSat (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        sku VARCHAR(191) NOT NULL UNIQUE,
        barcode VARCHAR(191) NULL,
        descripcion VARCHAR(191) NOT NULL,
        claveProdServ VARCHAR(191) NULL,
        claveUnidad VARCHAR(191) NOT NULL DEFAULT 'H87',
        objetoImp VARCHAR(191) NOT NULL DEFAULT '02',
        tasaIVA DOUBLE NOT NULL DEFAULT 0.16,
        hsCode VARCHAR(191) NULL,
        esDemo BOOLEAN NOT NULL DEFAULT TRUE,
        updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Tabla Documento
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Documento (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        docNumber VARCHAR(191) NOT NULL UNIQUE,
        fileHash VARCHAR(191) NOT NULL,
        formatoOrigen VARCHAR(191) NOT NULL,
        tipoFactura VARCHAR(191) NOT NULL,
        estado VARCHAR(191) NOT NULL DEFAULT 'BORRADOR',
        fechaEmision DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        serie VARCHAR(191) NOT NULL DEFAULT 'A',
        folio INT NOT NULL DEFAULT 1,
        clienteId VARCHAR(191) NULL,
        rfcReceptor VARCHAR(191) NULL,
        nombreReceptor VARCHAR(191) NULL,
        regimenReceptor VARCHAR(191) NULL,
        cpReceptor VARCHAR(191) NULL,
        usoCfdi VARCHAR(191) NULL,
        formaPago VARCHAR(191) NOT NULL DEFAULT '03',
        metodoPago VARCHAR(191) NOT NULL DEFAULT 'PUE',
        infoGlobal TEXT NULL,
        datosExtranjero TEXT NULL,
        datosCartaPorte TEXT NULL,
        subtotal DOUBLE NOT NULL,
        iva DOUBLE NOT NULL,
        total DOUBLE NOT NULL,
        totalPiezas INT NOT NULL,
        pesoTotalKg DOUBLE NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX (clienteId),
        FOREIGN KEY (clienteId) REFERENCES Cliente(id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Tabla DocumentoItem
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS DocumentoItem (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        documentoId VARCHAR(191) NOT NULL,
        piNo VARCHAR(191) NULL,
        sku VARCHAR(191) NOT NULL,
        descripcion VARCHAR(191) NOT NULL,
        brand VARCHAR(191) NULL,
        cantidad DOUBLE NOT NULL,
        piQty DOUBLE NULL,
        precioUnitario DOUBLE NOT NULL,
        rateReferencia DOUBLE NULL,
        retailPrice DOUBLE NULL,
        base DOUBLE NOT NULL,
        iva DOUBLE NOT NULL,
        importe DOUBLE NOT NULL,
        claveProdServ VARCHAR(191) NULL,
        claveUnidad VARCHAR(191) NOT NULL DEFAULT 'H87',
        purposeOfUse TEXT NULL,
        reference TEXT NULL,
        barcode VARCHAR(191) NULL,
        pesoKg DOUBLE NULL,
        excluido BOOLEAN NOT NULL DEFAULT FALSE,
        descuentoCien BOOLEAN NOT NULL DEFAULT FALSE,
        INDEX (documentoId),
        FOREIGN KEY (documentoId) REFERENCES Documento(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Tabla TimbreFiscal
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS TimbreFiscal (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        documentoId VARCHAR(191) NOT NULL UNIQUE,
        uuid VARCHAR(191) NOT NULL UNIQUE,
        fechaTimbrado DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        noCertificadoSat VARCHAR(191) NOT NULL DEFAULT '00001000000504465028',
        selloCfd TEXT NOT NULL,
        selloSat TEXT NOT NULL,
        cadenaOriginal TEXT NOT NULL,
        xmlContent LONGTEXT NOT NULL,
        estado VARCHAR(191) NOT NULL DEFAULT 'VIGENTE',
        motivoCancelacion VARCHAR(191) NULL,
        fechaCancelacion DATETIME(3) NULL,
        FOREIGN KEY (documentoId) REFERENCES Documento(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Tabla PlantillaCartaPorte
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS PlantillaCartaPorte (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        nombre VARCHAR(191) NOT NULL,
        origen VARCHAR(191) NOT NULL,
        destino VARCHAR(191) NOT NULL,
        distanciaKm DOUBLE NOT NULL,
        vehiculo VARCHAR(191) NOT NULL,
        placas VARCHAR(191) NOT NULL,
        operador VARCHAR(191) NOT NULL,
        rfcOperador VARCHAR(191) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Tabla BitacoraEvento
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS BitacoraEvento (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        documentoId VARCHAR(191) NOT NULL,
        tipo VARCHAR(191) NOT NULL,
        descripcion TEXT NOT NULL,
        detalles TEXT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX (documentoId),
        FOREIGN KEY (documentoId) REFERENCES Documento(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Tabla Usuario
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Usuario (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        nombre VARCHAR(191) NOT NULL,
        usuario VARCHAR(191) NULL UNIQUE,
        correo VARCHAR(191) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        rol VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migración retroactiva: agregar columna usuario si no existe
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE Usuario ADD COLUMN usuario VARCHAR(191) NULL UNIQUE;
      `);
    } catch {
      // Si la columna ya existe, se ignora
    }

    // Sincronizar catálogo inicial si está vacío
    const countProd = await prisma.productoSat.count().catch(() => 0);
    if (countProd === 0) {
      try {
        const sampleItems = require("../../prisma/sample_items.json");
        for (const it of sampleItems) {
          await prisma.productoSat.upsert({
            where: { sku: it.sku },
            update: {},
            create: {
              sku: it.sku,
              barcode: it.barcode || null,
              descripcion: it.descripcion,
              claveProdServ: "53131613",
              claveUnidad: "H87",
              objetoImp: "02",
              tasaIVA: 0.16,
              esDemo: false,
            },
          });
        }
      } catch (seedErr) {
        console.warn("Aviso al cargar catálogo inicial SAT:", seedErr);
      }
    }

    // Sincronizar usuario inicial si la tabla está vacía
    const countUsers = await prisma.usuario.count().catch(() => 0);
    if (countUsers === 0) {
      try {
        const { hashPassword } = await import("./auth-utils");
        await prisma.usuario.create({
          data: {
            nombre: "Admin StyleKorean",
            usuario: "admin",
            correo: "admin@stylekorean.mx",
            password: hashPassword("Admin123!"),
            rol: "ADMIN",
            activo: true,
          },
        });
      } catch (userErr) {
        console.warn("Aviso al crear usuario inicial:", userErr);
      }
    } else {
      // Si el admin inicial no tiene usuario asignado, asignarle 'admin'
      try {
        await prisma.usuario.updateMany({
          where: { correo: "admin@stylekorean.mx", usuario: null },
          data: { usuario: "admin" },
        });
      } catch {}
    }

    // Actualizar claves SAT por defecto (53131613 para productos, 78101800 para envíos)
    try {
      await prisma.$executeRawUnsafe(`
        UPDATE ProductoSat 
        SET claveProdServ = '53131613' 
        WHERE claveProdServ IS NULL OR claveProdServ = '' OR claveProdServ = '53131600';
      `);

      await prisma.$executeRawUnsafe(`
        UPDATE DocumentoItem 
        SET claveProdServ = '78101800', claveUnidad = 'E48', descripcion = 'Servicio de envio' 
        WHERE LOWER(sku) LIKE '%delivery%' OR LOWER(descripcion) LIKE '%delivery%' OR LOWER(sku) LIKE '%envio%' OR LOWER(descripcion) LIKE '%envio%';
      `);

      await prisma.$executeRawUnsafe(`
        UPDATE DocumentoItem 
        SET claveProdServ = '53131613', claveUnidad = 'H87' 
        WHERE (claveProdServ IS NULL OR claveProdServ = '' OR claveProdServ = '53131600') 
          AND LOWER(sku) NOT LIKE '%delivery%' AND LOWER(descripcion) NOT LIKE '%delivery%' AND LOWER(sku) NOT LIKE '%envio%' AND LOWER(descripcion) NOT LIKE '%envio%';
      `);

      await prisma.$executeRawUnsafe(`
        UPDATE DocumentoItem 
        SET excluido = 1, descuentoCien = 0 
        WHERE precioUnitario <= 0 AND excluido = 0;
      `);
    } catch (updErr) {
      console.warn("Aviso al actualizar claves SAT por defecto en la BD:", updErr);
    }

    tablesInitialized = true;
  } catch (err: any) {
    console.error("Error al asegurar tablas en MySQL:", err);
  }
}

