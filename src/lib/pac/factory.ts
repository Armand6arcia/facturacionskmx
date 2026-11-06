import { PacClient } from "./pac-interface";
import { MockPacClient } from "./mock-pac";

class FacturaComPacClient implements PacClient {
  async timbrar(): Promise<never> {
    throw new Error(
      "FacturaComPacClient no está activo en este entorno de demo. Configura las llaves reales de Factura.com y PAC_PROVIDER=facturacom para producción."
    );
  }
  async cancelar(): Promise<never> {
    throw new Error("FacturaComPacClient no activo en demo.");
  }
  async obtenerXml(): Promise<never> {
    throw new Error("FacturaComPacClient no activo en demo.");
  }
  async obtenerPdf(): Promise<never> {
    throw new Error("FacturaComPacClient no activo en demo.");
  }
}

export function getPacClient(): PacClient {
  const provider = (process.env.PAC_PROVIDER || "mock").toLowerCase();

  switch (provider) {
    case "facturacom":
      return new FacturaComPacClient();
    case "mock":
    default:
      return new MockPacClient();
  }
}

export * from "./pac-interface";
export * from "./mock-pac";

