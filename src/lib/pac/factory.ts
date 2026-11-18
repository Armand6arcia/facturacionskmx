import { PacClient } from "./pac-interface";
import { MockPacClient } from "./mock-pac";
import { FacturaComPacClient } from "./factura-com";

export function getPacClient(config?: {
  apiKey?: string | null;
  secretKey?: string | null;
  environment?: string | null;
  baseUrl?: string | null;
  provider?: string | null;
}): PacClient {
  const provider = (config?.provider || process.env.PAC_PROVIDER || "").toLowerCase();
  const hasFacturaKeys = Boolean(
    config?.apiKey ||
      process.env.FACTURA_COM_API_KEY ||
      process.env.FACTURACOM_API_KEY
  );

  // Si se configuró expresamente facturacom o si se proporcionaron las API keys
  if (provider === "facturacom" || (provider !== "mock" && hasFacturaKeys)) {
    return new FacturaComPacClient(config || undefined);
  }

  return new MockPacClient();
}

export * from "./pac-interface";
export * from "./mock-pac";
export * from "./factura-com";
