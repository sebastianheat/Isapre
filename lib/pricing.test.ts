import { describe, expect, it } from "vitest";
import { cotizar, factorDe, type FactorEtario } from "./pricing";

// Tabla de factores vigente 2026 (ver TECH-SPEC-marketplace-leads.md, 3.5 /
// analisis-tu7cl-cotizador.md).
const TABLA_FACTORES: FactorEtario[] = [
  { edadDesde: 0, edadHasta: 1, factorCotizante: 0.0, factorCarga: 0.0 },
  { edadDesde: 2, edadHasta: 19, factorCotizante: 0.6, factorCarga: 0.6 },
  { edadDesde: 20, edadHasta: 24, factorCotizante: 0.9, factorCarga: 0.7 },
  { edadDesde: 25, edadHasta: 34, factorCotizante: 1.0, factorCarga: 0.7 },
  { edadDesde: 35, edadHasta: 44, factorCotizante: 1.3, factorCarga: 0.9 },
  { edadDesde: 45, edadHasta: 54, factorCotizante: 1.4, factorCarga: 1.0 },
  { edadDesde: 55, edadHasta: 64, factorCotizante: 2.0, factorCarga: 1.4 },
  { edadDesde: 65, edadHasta: 100, factorCotizante: 2.4, factorCarga: 2.2 },
];

const UF_07_09_2026 = 40883;

describe("factorDe", () => {
  it("devuelve el factor cotizante correcto para 35 años", () => {
    expect(factorDe(35, "cotizante", TABLA_FACTORES)).toBe(1.3);
  });

  it("devuelve el factor carga correcto para 10 años", () => {
    expect(factorDe(10, "carga", TABLA_FACTORES)).toBe(0.6);
  });

  it("devuelve 0 si la edad no está en ninguna franja", () => {
    expect(factorDe(150, "cotizante", TABLA_FACTORES)).toBe(0);
  });
});

describe("cotizar — casos verificados contra tu7.cl (07-09-2026)", () => {
  it("SALUD CONECTA CLÁSICO 00/2601 (Banmédica): cotizante de 35 años", () => {
    const resultado = cotizar(
      { baseUf: 0.94, gesUf: 0.778 },
      [{ edad: 35, tipo: "cotizante" }],
      TABLA_FACTORES,
      UF_07_09_2026,
    );
    expect(resultado.totalUf).toBeCloseTo(2.0, 3);
    expect(resultado.totalPesos).toBe(81766);
  });

  it("CORE 10 01 26 (Consalud): cotizante de 35 años", () => {
    const resultado = cotizar(
      { baseUf: 1.16, gesUf: 0.731 },
      [{ edad: 35, tipo: "cotizante" }],
      TABLA_FACTORES,
      UF_07_09_2026,
    );
    expect(resultado.totalUf).toBeCloseTo(2.239, 3);
    expect(resultado.totalPesos).toBe(91537);
  });

  it('sin beneficiarios usa el factor "desde" comercial (0.9), nunca $0', () => {
    const resultado = cotizar({ baseUf: 0.94, gesUf: 0.778 }, [], TABLA_FACTORES, UF_07_09_2026);
    expect(resultado.esDesde).toBe(true);
    expect(resultado.totalUf).toBeCloseTo(0.94 * 0.9 + 0.778, 3);
    expect(resultado.totalPesos).toBeGreaterThan(0);
  });

  it("suma correctamente el GES por cada beneficiario adicional (cotizante + 1 carga)", () => {
    const resultado = cotizar(
      { baseUf: 1.0, gesUf: 0.5 },
      [
        { edad: 35, tipo: "cotizante" },
        { edad: 10, tipo: "carga" },
      ],
      TABLA_FACTORES,
      UF_07_09_2026,
    );
    // Σ factores = 1.3 (cotizante 35) + 0.6 (carga 10) = 1.9
    // total UF = 1.0 * 1.9 + 0.5 * 2 = 2.9
    expect(resultado.sumaFactores).toBeCloseTo(1.9, 3);
    expect(resultado.totalUf).toBeCloseTo(2.9, 3);
  });
});
