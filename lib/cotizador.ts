// Motor de cotización Nueva Masvida (NMV) — cálculos deterministas.
// Las cifras NO las hace el modelo; se calculan aquí para que sean exactas.

const GES_UF = 0.854;

// Catálogo Pleno Salud — UF base por plan.
const CATALOGO_UF: Record<string, number> = {
  PS251000: 1.916,
  PS251001: 1.979,
  PS251002: 2.015,
  PS251003: 2.06,
  PS251004: 2.087,
  PS251005: 2.123,
  PS251006: 2.159,
  PS251007: 2.231,
  PS251008: 2.303,
  PS251009: 2.375,
  PS251010: 2.447,
  PS251011: 2.519,
  PS251012: 2.591,
};

// Las 3 opciones que se presentan al cliente (económica / recomendada / premium).
const OPCIONES = [
  { codigo: "PS251002", etiqueta: "Económica", cobertura: "Cobertura amplia en clínicas de la red" },
  { codigo: "PS251005", etiqueta: "Recomendada", cobertura: "Mejor cobertura y más clínicas incluidas" },
  { codigo: "PS251010", etiqueta: "Premium", cobertura: "Cobertura máxima y red más amplia" },
] as const;

// Factores por tramo de edad: [cotizante, carga].
function factorPorEdad(edad: number): { cotizante: number; carga: number } {
  if (edad <= 1) return { cotizante: 0, carga: 0 };
  if (edad <= 19) return { cotizante: 0.6, carga: 0.6 };
  if (edad <= 24) return { cotizante: 0.9, carga: 0.7 };
  if (edad <= 34) return { cotizante: 1.0, carga: 0.7 };
  if (edad <= 44) return { cotizante: 1.3, carga: 0.9 };
  if (edad <= 54) return { cotizante: 1.4, carga: 1.0 };
  if (edad <= 64) return { cotizante: 2.0, carga: 1.4 };
  return { cotizante: 2.4, carga: 2.2 };
}

const pesos = (n: number) =>
  "$" + Math.round(n).toLocaleString("es-CL", { maximumFractionDigits: 0 });

export interface Carga {
  edad: number;
}

export interface OpcionPlan {
  codigo: string;
  etiqueta: string;
  cobertura: string;
  precio_pesos: number;
  precio_pesos_fmt: string;
  excedente_pesos: number;
  excedente_fmt: string;
}

export interface ResultadoCotizacion {
  valor_uf: number;
  cotizacion_7_pesos: number;
  cotizacion_7_fmt: string;
  total_factores: number;
  opciones: OpcionPlan[];
  nota: string;
}

export function cotizar(
  edad: number,
  rentaMensual: number,
  cargas: Carga[],
  valorUF: number,
): ResultadoCotizacion {
  const fCot = factorPorEdad(edad).cotizante;
  const fCargas = (cargas ?? []).reduce((sum, c) => sum + factorPorEdad(c.edad).carga, 0);
  const totalFactores = fCot + fCargas;

  const cotizacion7 = rentaMensual * 0.07;

  const opciones: OpcionPlan[] = OPCIONES.map((opt) => {
    const ufBase = CATALOGO_UF[opt.codigo];
    const precioUF = ufBase * totalFactores + GES_UF;
    const precioPesos = precioUF * valorUF;
    const excedente = precioPesos - cotizacion7;
    return {
      codigo: opt.codigo,
      etiqueta: opt.etiqueta,
      cobertura: opt.cobertura,
      precio_pesos: Math.round(precioPesos),
      precio_pesos_fmt: pesos(precioPesos),
      excedente_pesos: Math.round(excedente),
      excedente_fmt: pesos(excedente),
    };
  });

  return {
    valor_uf: valorUF,
    cotizacion_7_pesos: Math.round(cotizacion7),
    cotizacion_7_fmt: pesos(cotizacion7),
    total_factores: Number(totalFactores.toFixed(2)),
    opciones,
    nota: "El % exacto de cobertura por clínica lo confirma la ejecutiva al cierre.",
  };
}

// Valor UF en vivo desde mindicador.cl, con fallback si la API falla.
const UF_FALLBACK = 40093.59;

export async function obtenerValorUF(): Promise<number> {
  try {
    const res = await fetch("https://mindicador.cl/api/uf", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return UF_FALLBACK;
    const data = await res.json();
    const valor = data?.serie?.[0]?.valor;
    return typeof valor === "number" && valor > 0 ? valor : UF_FALLBACK;
  } catch {
    return UF_FALLBACK;
  }
}
