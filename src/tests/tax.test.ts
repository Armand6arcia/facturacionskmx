import { describe, it, expect } from "vitest";
import { calculateDocumentTaxes, calculateLineTaxes, round2 } from "../lib/tax/calculator";

describe("Tax Calculation Engine", () => {
  it("calculates line rounding correctly: base = round(qty * price, 2), iva = round(base * 0.16, 2)", () => {
    // 3 pieces at 245.50
    const res = calculateLineTaxes({ cantidad: 3, precioUnitario: 245.5 });
    expect(res.base).toBe(736.5);
    expect(res.iva).toBe(117.84); // 736.50 * 0.16 = 117.84
    expect(res.importe).toBe(854.34);
  });

  it("handles tolerance test: exact 16% on subtotal 75,982.59 would be 12,157.21; sum of lines is 12,157.19 (diff 0.02 is valid)", () => {
    const directIva = round2(75982.59 * 0.16);
    expect(directIva).toBe(12157.21);

    const lineSumIva = 12157.19;
    const diff = round2(Math.abs(directIva - lineSumIva));
    expect(diff).toBe(0.02);
    // Difference is within 0.05 MXN tolerance
    expect(diff <= 0.05).toBe(true);
  });

  it("flags red error when file total differs by more than 0.05 MXN", () => {
    const lines = [
      { cantidad: 10, precioUnitario: 100 }, // base 1000, iva 160, total 1160
    ];
    // Exact total 1160, file total 1160.03 -> diff 0.03 <= 0.05 -> valid
    const resOk = calculateDocumentTaxes(lines, 1000, 1160.03);
    expect(resOk.cuadraConArchivo).toBe(true);
    expect(resOk.diferenciaConArchivo).toBe(0.03);

    // Exact total 1160, file total 1160.10 -> diff 0.10 > 0.05 -> red alert
    const resError = calculateDocumentTaxes(lines, 1000, 1160.1);
    expect(resError.cuadraConArchivo).toBe(false);
    expect(resError.diferenciaConArchivo).toBe(0.1);
  });

  it("handles promo items with 100% discount vs excluded", () => {
    const promoLine = { cantidad: 2, precioUnitario: 500, descuentoCien: true };
    const resPromo = calculateLineTaxes(promoLine);
    expect(resPromo.base).toBe(0);
    expect(resPromo.iva).toBe(0);
    expect(resPromo.descuento).toBe(1000);

    const excludedLine = { cantidad: 2, precioUnitario: 500, excluido: true };
    const resEx = calculateLineTaxes(excludedLine);
    expect(resEx.base).toBe(0);
    expect(resEx.iva).toBe(0);
    expect(resEx.descuento).toBe(0);
  });
});

