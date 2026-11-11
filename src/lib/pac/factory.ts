import { PacClient } from "./pac-interface";
import { MockPacClient } from "./mock-pac";
import { FacturaComPacClient } from "./factura-com";

export function getPacClient(): PacClient {
  const provider = (process.env.PAC_PROVIDER || "").toLowerCase();
  const hasFacturaKeys = Boolean(
    process.env.FACTURA_COM_API_KEY || process.env.FACTURACOM_API_KEY
  );

  // Si se configuró expresamente facturacom o si se proporcionaron las API keys en Hostinger
  if (provider === "facturacom" || (provider !== "mock" && hasFacturaKeys)) {
    return new FacturaComPacClient();
  }

  return new MockPacClient();
}

export * from "./pac-interface";
export * from "./mock-pac";
export * from "./factura-com";
