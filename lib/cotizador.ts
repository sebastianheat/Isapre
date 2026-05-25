// Motor de cotización Nueva Masvida (NMV).
// Usa el catálogo REAL (lib/catalogo-nuevamasvida.json, fuente tu7.cl) y la
// fórmula oficial. Las cifras NO las inventa el modelo: se calculan aquí.
//
// Fórmula (igual a la del cotizador de nuevaisapre.cl):
//   precioUF   = uf_base × Σ(factor de cada beneficiario) + GES × nº beneficiarios
//   El GES (0.854 UF en NMV) se cobra POR beneficiario, no una vez por contrato.

import catalogo from "./catalogo-nuevamasvida.json";
import coberturas from "./coberturas-nuevamasvida.json";

const GES_UF: number = catalogo.ges_uf;
const PDF_BASE = "https://nuevaisapre.cl/pdfs/nuevamasvida";

// Cobertura por clínica (extraída de los PDF oficiales). Solo incluye planes
// metropolitanos validados; el resto cae a la cobertura general del catálogo.
interface TramoCobertura {
  pct: number;
  clinicas: string[];
}
const COBERTURAS = coberturas as Record<
  string,
  { hosp: TramoCobertura[]; amb: TramoCobertura[]; amb_igual_hosp: boolean }
>;

interface PlanRaw {
  codigo: string;
  serie: string;
  nombre: string;
  tipo: string;
  uf_base: number;
  hosp_pct: number;
  amb_pct: number;
  prest_hosp: string[];
  prest_amb: string[];
  prest_derivados?: string[];
}

const PLANES = catalogo.planes as PlanRaw[];

// Factores por edad — Tabla de Factores Nº 64 (cotizante / carga).
function factorCotizante(edad: number): number {
  if (edad <= 19) return 0.6;
  if (edad <= 24) return 0.9;
  if (edad <= 34) return 1.0;
  if (edad <= 44) return 1.3;
  if (edad <= 54) return 1.4;
  if (edad <= 64) return 2.0;
  return 2.4;
}

// Las cargas se empiezan a cobrar desde los 2 años (antes no suman precio).
function factorCarga(edad: number): number {
  if (edad < 2) return 0;
  if (edad <= 19) return 0.6;
  if (edad <= 24) return 0.7;
  if (edad <= 34) return 0.7;
  if (edad <= 44) return 0.9;
  if (edad <= 54) return 1.0;
  if (edad <= 64) return 1.4;
  return 2.2;
}

const pesos = (n: number) =>
  "$" + Math.round(n).toLocaleString("es-CL", { maximumFractionDigits: 0 });
const uf = (n: number) => n.toFixed(3).replace(".", ",") + " UF";

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export interface Carga {
  edad: number;
}

export interface Beneficiario {
  rol: "Cotizante" | "Carga";
  edad: number;
  factor: number;
  uf: number;
  uf_fmt: string;
  pesos: number;
  pesos_fmt: string;
}

export interface OpcionPlan {
  etiqueta: "Económica" | "Recomendada" | "Premium";
  codigo: string;
  nombre: string;
  tipo: string;
  uf_base: number;
  cobertura_hospitalaria_pct: number;
  cobertura_ambulatoria_pct: number;
  // Clínicas de la red preferente, con la preferida del cliente primero.
  prestadores_hospitalarios: string[];
  prestadores_ambulatorios: string[];
  clinica_preferida_en_red: boolean;
  beneficiarios: Beneficiario[];
  precio_uf: number;
  precio_uf_fmt: string;
  precio_pesos: number;
  precio_pesos_fmt: string;
  excedente_pesos: number;
  excedente_fmt: string;
  pdf_url: string;
  // Desglose de cobertura por clínica (solo planes metropolitanos validados).
  cobertura_por_clinica: {
    hospitalaria: TramoCobertura[];
    ambulatoria: TramoCobertura[];
    ambulatoria_igual_hospitalaria: boolean;
  } | null;
}

export interface ResultadoCotizacion {
  valor_uf: number;
  cotizacion_7_pesos: number;
  cotizacion_7_fmt: string;
  modo_libre_eleccion: boolean;
  aviso?: string;
  opciones: OpcionPlan[];
  nota: string;
}

interface PlanCalc extends PlanRaw {
  precioUF: number;
  precioPesos: number;
}

function construirBeneficiarios(
  edad: number,
  cargas: Carga[],
  ufBase: number,
  valorUF: number,
): Beneficiario[] {
  const lista: Beneficiario[] = [];
  const fCot = factorCotizante(edad);
  const ufCot = ufBase * fCot + GES_UF;
  lista.push({
    rol: "Cotizante",
    edad,
    factor: fCot,
    uf: ufCot,
    uf_fmt: uf(ufCot),
    pesos: Math.round(ufCot * valorUF),
    pesos_fmt: pesos(ufCot * valorUF),
  });
  for (const c of cargas) {
    const f = factorCarga(c.edad);
    const ufc = f > 0 ? ufBase * f + GES_UF : 0;
    lista.push({
      rol: "Carga",
      edad: c.edad,
      factor: f,
      uf: ufc,
      uf_fmt: uf(ufc),
      pesos: Math.round(ufc * valorUF),
      pesos_fmt: pesos(ufc * valorUF),
    });
  }
  return lista;
}

function ordenarPorPreferida(prest: string[], preferida: string | null): string[] {
  if (!preferida) return prest;
  const q = normalizar(preferida);
  const match = (n: string) => {
    const nn = normalizar(n);
    return nn.includes(q) || q.includes(nn);
  };
  return [...prest].sort((a, b) => Number(match(b)) - Number(match(a)));
}

function planMatcheaClinica(p: PlanRaw, preferida: string): boolean {
  const q = normalizar(preferida);
  return [...(p.prest_hosp || []), ...(p.prest_amb || [])].some((n) => {
    const nn = normalizar(n);
    return nn.includes(q) || q.includes(nn);
  });
}

// Región de cada clínica de la red NMV (por substring del nombre).
const REGION_RULES: [string, string][] = [
  ["renaca", "Valparaíso"],
  ["bupa antofagasta", "Antofagasta"],
  ["vina del mar", "Valparaíso"],
  ["ciudad del mar", "Valparaíso"],
  ["los leones", "Valparaíso"],
  ["los carrera", "Valparaíso"],
  ["san jose", "Arica y Parinacota"],
  ["tarapaca", "Tarapacá"],
  ["la portada", "Antofagasta"],
  ["atacama", "Atacama"],
  ["los andes (los", "Biobío"],
  ["biobio", "Biobío"],
  ["del sur", "Biobío"],
  ["isamedica", "O'Higgins"],
  ["lircay", "Maule"],
  ["puerto montt", "Los Lagos"],
  ["osorno", "Los Lagos"],
  ["temuco", "Araucanía"],
  ["valdivia", "Los Ríos"],
];
function regionDeClinica(nombre: string): string {
  const n = normalizar(nombre);
  for (const [k, r] of REGION_RULES) if (n.includes(k)) return r;
  return "Metropolitana";
}
function planEnRegion(p: PlanRaw, region: string): boolean {
  return [...(p.prest_hosp || []), ...(p.prest_amb || [])].some(
    (c) => regionDeClinica(c) === region,
  );
}

// Texto libre de región/ciudad del cliente -> bucket de región.
const REGION_KEYWORDS: [string, string][] = [
  ["metropolitana", "Metropolitana"], ["santiago", "Metropolitana"], ["maipu", "Metropolitana"],
  ["puente alto", "Metropolitana"], ["providencia", "Metropolitana"], ["nunoa", "Metropolitana"],
  ["la florida", "Metropolitana"], ["rm", "Metropolitana"],
  ["vina", "Valparaíso"], ["valparaiso", "Valparaíso"], ["renaca", "Valparaíso"],
  ["quilpue", "Valparaíso"], ["villa alemana", "Valparaíso"], ["quillota", "Valparaíso"], ["concon", "Valparaíso"],
  ["arica", "Arica y Parinacota"],
  ["iquique", "Tarapacá"], ["tarapaca", "Tarapacá"], ["hospicio", "Tarapacá"],
  ["antofagasta", "Antofagasta"], ["calama", "Antofagasta"],
  ["copiapo", "Atacama"], ["atacama", "Atacama"], ["vallenar", "Atacama"],
  ["rancagua", "O'Higgins"], ["higgins", "O'Higgins"], ["san fernando", "O'Higgins"],
  ["talca", "Maule"], ["maule", "Maule"], ["curico", "Maule"], ["linares", "Maule"],
  ["concepcion", "Biobío"], ["biobio", "Biobío"], ["bio bio", "Biobío"], ["talcahuano", "Biobío"],
  ["los angeles", "Biobío"], ["chillan", "Biobío"], ["nuble", "Biobío"], ["coronel", "Biobío"],
  ["puerto montt", "Los Lagos"], ["osorno", "Los Lagos"], ["los lagos", "Los Lagos"],
  ["puerto varas", "Los Lagos"], ["castro", "Los Lagos"], ["chiloe", "Los Lagos"],
  ["temuco", "Araucanía"], ["araucania", "Araucanía"], ["angol", "Araucanía"], ["villarrica", "Araucanía"],
  ["valdivia", "Los Ríos"], ["los rios", "Los Ríos"], ["la union", "Los Ríos"],
];
function normalizarRegion(txt: string): string | null {
  const n = normalizar(txt);
  for (const [k, r] of REGION_KEYWORDS) if (n.includes(k)) return r;
  return null;
}

export function cotizar(
  edad: number,
  sueldoLiquido: number,
  cargas: Carga[],
  valorUF: number,
  clinicaPreferida?: string | null,
  region?: string | null,
): ResultadoCotizacion {
  const cargasSafe = Array.isArray(cargas) ? cargas : [];
  const preferida = clinicaPreferida?.trim() ? clinicaPreferida.trim() : null;
  const regionBucket = region?.trim() ? normalizarRegion(region) : null;

  const factorTotal =
    factorCotizante(edad) + cargasSafe.reduce((s, c) => s + factorCarga(c.edad), 0);
  const numBeneficiariosGES =
    1 + cargasSafe.filter((c) => factorCarga(c.edad) > 0).length;

  const cotizados: PlanCalc[] = PLANES.map((p) => {
    const precioUF = p.uf_base * factorTotal + GES_UF * numBeneficiariosGES;
    return { ...p, precioUF, precioPesos: precioUF * valorUF };
  });

  // El cliente entrega su sueldo LÍQUIDO. Estimamos el bruto/imponible
  // (bruto ≈ líquido ÷ 0,8) y de ahí calculamos el 7% legal de salud.
  const brutoEstimado = sueldoLiquido / 0.8;
  const target7 = brutoEstimado * 0.07;

  // Filtro geográfico: si conocemos la región, nos quedamos con los planes que
  // tengan al menos una clínica en esa región (si hay suficientes).
  let universoRegion = cotizados;
  if (regionBucket) {
    const enRegion = cotizados.filter((p) => planEnRegion(p, regionBucket));
    if (enRegion.length >= 3) universoRegion = enRegion;
  }

  // Filtro por clínica preferida (dentro de la región).
  const aplicables = preferida
    ? universoRegion.filter((p) => planMatcheaClinica(p, preferida))
    : universoRegion;
  const modoLibreEleccion = !!preferida && aplicables.length === 0;

  let universo: PlanCalc[];
  let aviso: string | undefined;
  if (modoLibreEleccion) {
    const le = cotizados.filter((p) => p.tipo === "Libre Elección");
    universo = le.length > 0 ? le : cotizados;
    aviso =
      `La clínica indicada ("${preferida}") no está en la red preferente de Nueva Masvida. ` +
      `Te muestro planes de Libre Elección, que te dan cobertura en cualquier prestador. ` +
      `Cynthia puede confirmar alternativas para esa clínica.`;
  } else {
    universo = aplicables.length >= 3 ? aplicables : universoRegion;
  }

  // Selección de la línea de planes:
  //  - Si el cliente puede pagar un Pleno Max (su 7% cubre el PM más barato),
  //    priorizamos PM (mejor cobertura) para rentas altas.
  //  - Si no, preferimos Pleno Salud (PS); luego cualquier Preferente; luego todo.
  let fuente = universo;
  if (!modoLibreEleccion) {
    const pm = universo.filter((p) => p.serie === "PM");
    const ps = universo.filter((p) => p.serie === "PS");
    const pmMin = pm.length ? Math.min(...pm.map((p) => p.precioPesos)) : Infinity;
    if (pm.length >= 3 && target7 >= pmMin) {
      fuente = pm;
    } else if (ps.length >= 3) {
      fuente = ps;
    } else {
      const pref = universo.filter((p) => p.tipo === "Preferente");
      fuente = pref.length >= 3 ? pref : universo;
    }
  }

  // Selección anclada al 7%: ventana de 3 (más barato / cercano / más caro).
  const ordPrecio = [...fuente].sort((a, b) => a.precioPesos - b.precioPesos);
  let elegidos: PlanCalc[];
  if (ordPrecio.length >= 3 && target7 > 0) {
    let ai = 0;
    let mejorDif = Infinity;
    ordPrecio.forEach((p, i) => {
      const d = Math.abs(p.precioPesos - target7);
      if (d < mejorDif) {
        mejorDif = d;
        ai = i;
      }
    });
    const n = ordPrecio.length;
    const mid = Math.min(Math.max(ai, 1), n - 2);
    elegidos = [ordPrecio[mid - 1], ordPrecio[mid], ordPrecio[mid + 1]];
  } else if (ordPrecio.length === 2) {
    elegidos = [ordPrecio[0], ordPrecio[0], ordPrecio[1]];
  } else if (ordPrecio.length === 1) {
    elegidos = [ordPrecio[0], ordPrecio[0], ordPrecio[0]];
  } else {
    elegidos = [];
  }

  const etiquetas: OpcionPlan["etiqueta"][] = ["Económica", "Recomendada", "Premium"];
  const opciones: OpcionPlan[] = elegidos.map((p, i) => {
    const beneficiarios = construirBeneficiarios(edad, cargasSafe, p.uf_base, valorUF);
    const enRed = preferida ? planMatcheaClinica(p, preferida) : false;
    return {
      etiqueta: etiquetas[i],
      codigo: p.codigo,
      nombre: p.nombre,
      tipo: p.tipo,
      uf_base: p.uf_base,
      cobertura_hospitalaria_pct: p.hosp_pct,
      cobertura_ambulatoria_pct: p.amb_pct,
      prestadores_hospitalarios: ordenarPorPreferida(p.prest_hosp || [], preferida),
      prestadores_ambulatorios: ordenarPorPreferida(p.prest_amb || [], preferida),
      clinica_preferida_en_red: enRed,
      beneficiarios,
      precio_uf: Number(p.precioUF.toFixed(3)),
      precio_uf_fmt: uf(p.precioUF),
      precio_pesos: Math.round(p.precioPesos),
      precio_pesos_fmt: pesos(p.precioPesos),
      excedente_pesos: Math.round(p.precioPesos - target7),
      excedente_fmt: pesos(p.precioPesos - target7),
      pdf_url: `${PDF_BASE}/${p.codigo}.pdf`,
      cobertura_por_clinica: (() => {
        const det = COBERTURAS[p.codigo];
        if (!det) return null;
        return {
          hospitalaria: det.hosp,
          ambulatoria: det.amb,
          ambulatoria_igual_hospitalaria: det.amb.length === 0 && det.amb_igual_hosp,
        };
      })(),
    };
  });

  return {
    valor_uf: valorUF,
    cotizacion_7_pesos: Math.round(target7),
    cotizacion_7_fmt: pesos(target7),
    modo_libre_eleccion: modoLibreEleccion,
    aviso,
    opciones,
    nota:
      "Cobertura preferente: el % indicado aplica en las clínicas de la red del plan; " +
      "fuera de ellas rige la cobertura de libre elección. El detalle por clínica y los " +
      "topes están en el PDF de cada plan. Cynthia confirma todo al cierre.",
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
