// Motor de cálculo del cotizador. Puro, sin dependencias de framework —
// testeado de forma aislada (ver TECH-SPEC-marketplace-leads.md, sección 8.4).
//
// Fórmula (verificada contra tu7.cl el 07-09-2026, ver
// analisis-tu7cl-cotizador.md):
//   Valor por beneficiario (UF) = (Precio Base × Factor del beneficiario) + GES de la isapre
//   Valor total del plan   (UF) = (Precio Base × Σ Factores) + (GES × N.º de beneficiarios)
//   Valor total en pesos        = Valor total UF × Valor UF del día

export type TipoBeneficiario = "cotizante" | "carga";

export interface Beneficiario {
  edad: number;
  tipo: TipoBeneficiario;
}

export interface FactorEtario {
  edadDesde: number;
  edadHasta: number;
  factorCotizante: number;
  factorCarga: number;
}

export interface PlanBase {
  baseUf: number;
  gesUf: number;
}

export interface DetalleBeneficiario extends Beneficiario {
  factor: number;
  valorPlan: number;
  totalUf: number;
}

export interface ResultadoCotizacion {
  detalle: DetalleBeneficiario[];
  sumaFactores: number;
  totalUf: number;
  totalPesos: number;
  esDesde: boolean;
}

// Factor mínimo comercial usado cuando no hay beneficiarios cargados todavía
// ("precio desde") — nunca se muestra un plan en $0. Decisión de UX de tu7.cl
// que se replica deliberadamente (ver Tech Spec, gotcha "motor de cotización").
const FACTOR_DESDE = 0.9;

export function factorDe(edad: number, tipo: TipoBeneficiario, tabla: FactorEtario[]): number {
  const fila = tabla.find((f) => edad >= f.edadDesde && edad <= f.edadHasta);
  if (!fila) return 0;
  return tipo === "cotizante" ? fila.factorCotizante : fila.factorCarga;
}

function redondear(valor: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

export function cotizar(
  plan: PlanBase,
  beneficiarios: Beneficiario[],
  tabla: FactorEtario[],
  ufValor: number,
): ResultadoCotizacion {
  const detalle: DetalleBeneficiario[] = beneficiarios.map((b) => {
    const factor = factorDe(b.edad, b.tipo, tabla);
    const valorPlan = plan.baseUf * factor;
    return { ...b, factor, valorPlan, totalUf: redondear(valorPlan + plan.gesUf, 3) };
  });

  const sumaFactores = detalle.reduce((suma, d) => suma + d.factor, 0);
  const esDesde = beneficiarios.length === 0;
  const factoresEfectivos = esDesde ? FACTOR_DESDE : sumaFactores;
  const nBeneficiarios = beneficiarios.length || 1;

  const totalUf = plan.baseUf * factoresEfectivos + plan.gesUf * nBeneficiarios;

  return {
    detalle,
    sumaFactores,
    totalUf: redondear(totalUf, 3),
    totalPesos: Math.round(totalUf * ufValor),
    esDesde,
  };
}

export function fmtPesos(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return "$" + Math.round(valor).toLocaleString("es-CL");
}
