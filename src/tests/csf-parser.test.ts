import { describe, it, expect } from "vitest";
import { parseCsfText, limpiarRazonSocialCfdi40 } from "../lib/parsers/csf-parser";

describe("CSF Parser (Constancia de Situación Fiscal)", () => {
  describe("limpiarRazonSocialCfdi40", () => {
    it("elimina S.A. DE C.V. y variaciones para cumplir CFDI 4.0", () => {
      expect(limpiarRazonSocialCfdi40("STYLE KOREAN MEXICO S.A. DE C.V.")).toBe("STYLE KOREAN MEXICO");
      expect(limpiarRazonSocialCfdi40("DISTRIBUIDORA KOREA, S.A. DE C.V.")).toBe("DISTRIBUIDORA KOREA");
      expect(limpiarRazonSocialCfdi40("COSMETICOS DEL PACIFICO S DE RL DE CV")).toBe("COSMETICOS DEL PACIFICO");
      expect(limpiarRazonSocialCfdi40("INNOVACIONES BEAUTY S.A.P.I. DE C.V.")).toBe("INNOVACIONES BEAUTY");
      expect(limpiarRazonSocialCfdi40("SERVICIOS LOGISTICOS SC")).toBe("SERVICIOS LOGISTICOS");
      expect(limpiarRazonSocialCfdi40("FUNDACION AYUDA A.C.")).toBe("FUNDACION AYUDA");
    });

    it("mantiene nombres de personas o empresas sin sufijo societario", () => {
      expect(limpiarRazonSocialCfdi40("JUAN PEREZ GARCIA")).toBe("JUAN PEREZ GARCIA");
      expect(limpiarRazonSocialCfdi40("GLOBAL BEAUTY IMPORT")).toBe("GLOBAL BEAUTY IMPORT");
    });
  });

  describe("parseCsfText", () => {
    it("extrae datos de Persona Moral correctamente", () => {
      const mockCsfMoral = `
        SERVICIO DE ADMINISTRACIÓN TRIBUTARIA
        CONSTANCIA DE SITUACIÓN FISCAL
        Lugar y Fecha de Emisión: CIUDAD DE MÉXICO A 15 DE ENERO DE 2024
        
        Datos de Identificación del Contribuyente:
        RFC: SKM220101ABC
        Denominación/Razón Social: STYLE KOREAN MEXICO S.A. DE C.V.
        Régimen Capital: SOCIEDAD ANÓNIMA DE CAPITAL VARIABLE
        Fecha de inicio de operaciones: 01/01/2022
        
        Datos del Domicilio Registrado:
        Código Postal: 06700
        Tipo de Vialidad: AVENIDA
        Nombre de Vialidad: INSURGENTES SUR
        Número Exterior: 123
        Colonia: ROMA NORTE
        
        Regímenes:
        Régimen: Régimen General de Ley Personas Morales
        Fecha de alta: 01/01/2022
      `;

      const result = parseCsfText(mockCsfMoral);
      expect(result.rfc).toBe("SKM220101ABC");
      expect(result.tipoPersona).toBe("MORAL");
      expect(result.razonSocial).toBe("STYLE KOREAN MEXICO");
      expect(result.codigoPostal).toBe("06700");
      expect(result.regimenFiscal).toBe("601");
      expect(result.usoCfdiSugerido).toBe("G03");
    });

    it("extrae datos de Persona Física correctamente", () => {
      const mockCsfFisica = `
        CONSTANCIA DE SITUACIÓN FISCAL
        Datos de Identificación del Contribuyente:
        RFC: GAAL850215XYZ
        CURP: GAAL850215HDFRRN01
        Nombre (s): ALEJANDRO
        Primer Apellido: GARCIA
        Segundo Apellido: ALVAREZ
        
        Datos del Domicilio Registrado:
        Código Postal: 03100
        Colonia: DEL VALLE
        
        Regímenes:
        Régimen de las Personas Físicas con Actividades Empresariales y Profesionales
      `;

      const result = parseCsfText(mockCsfFisica);
      expect(result.rfc).toBe("GAAL850215XYZ");
      expect(result.tipoPersona).toBe("FISICA");
      expect(result.razonSocial).toBe("ALEJANDRO GARCIA ALVAREZ");
      expect(result.codigoPostal).toBe("03100");
      expect(result.regimenFiscal).toBe("612");
      expect(result.curp).toBe("GAAL850215HDFRRN01");
      expect(result.usoCfdiSugerido).toBe("G03");
    });

    it("detecta régimen RESICO 626", () => {
      const mockResico = `
        RFC: RESI900101888
        Nombre (s): MARIA
        Primer Apellido: LOPEZ
        Segundo Apellido: HERNANDEZ
        Código Postal: 44100
        Regímenes:
        Régimen Simplificado de Confianza
      `;

      const result = parseCsfText(mockResico);
      expect(result.rfc).toBe("RESI900101888");
      expect(result.razonSocial).toBe("MARIA LOPEZ HERNANDEZ");
      expect(result.codigoPostal).toBe("44100");
      expect(result.regimenFiscal).toBe("626");
    });
  });
});
