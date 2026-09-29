// Datos de muestra para probar la pantalla del cotizador (Skill #8, UI).
// El catálogo real vive en Postgres una vez migrado (ver TECH-SPEC 4.2) —
// esto es solo para la pantalla insignia mientras esa migración no existe.
import type { FactorEtario } from "./pricing";

export const TABLA_FACTORES_2026: FactorEtario[] = [
  { edadDesde: 0, edadHasta: 1, factorCotizante: 0.0, factorCarga: 0.0 },
  { edadDesde: 2, edadHasta: 19, factorCotizante: 0.6, factorCarga: 0.6 },
  { edadDesde: 20, edadHasta: 24, factorCotizante: 0.9, factorCarga: 0.7 },
  { edadDesde: 25, edadHasta: 34, factorCotizante: 1.0, factorCarga: 0.7 },
  { edadDesde: 35, edadHasta: 44, factorCotizante: 1.3, factorCarga: 0.9 },
  { edadDesde: 45, edadHasta: 54, factorCotizante: 1.4, factorCarga: 1.0 },
  { edadDesde: 55, edadHasta: 64, factorCotizante: 2.0, factorCarga: 1.4 },
  { edadDesde: 65, edadHasta: 100, factorCotizante: 2.4, factorCarga: 2.2 },
];

export const UF_HOY = 40883;

export type TierPlan = "economica" | "recomendada" | "premium";

export interface PlanCatalogo {
  id: string;
  codigo: string;
  isapreNombre: string;
  tier: TierPlan;
  baseUf: number;
  gesUf: number;
  coberturaHospitalaria: number;
  coberturaAmbulatoria: number;
}

export const PLANES_MUESTRA: PlanCatalogo[] = [
  {
    id: "p1",
    codigo: "CS4266050",
    isapreNombre: "Consalud",
    tier: "economica",
    baseUf: 0.82,
    gesUf: 0.731,
    coberturaHospitalaria: 70,
    coberturaAmbulatoria: 50,
  },
  {
    id: "p2",
    codigo: "BNCU241102",
    isapreNombre: "Banmédica",
    tier: "recomendada",
    baseUf: 0.94,
    gesUf: 0.778,
    coberturaHospitalaria: 80,
    coberturaAmbulatoria: 60,
  },
  {
    id: "p3",
    codigo: "CB1266080",
    isapreNombre: "Cruz Blanca",
    tier: "premium",
    baseUf: 1.28,
    gesUf: 0.971,
    coberturaHospitalaria: 100,
    coberturaAmbulatoria: 80,
  },
];
