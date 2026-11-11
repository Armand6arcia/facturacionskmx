import { PacClient } from "./pac-interface";
import { MockPacClient } from "./mock-pac";
import { FacturaComPacClient } from "./factura-com";

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
export * from "./factura-com";
