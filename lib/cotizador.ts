// Motor de cotización multi-isapre.
// Usa los catálogos REALES de las 7 isapres (lib/catalogos.json, fuente tu7.cl).
// Por defecto cotiza Nueva Masvida; cambia de isapre según la necesidad del
// cliente (clínica preferida, región que NMV no cubre, o isapre solicitada).
//
// Fórmula: precioUF = uf_base × Σ(factores) + GES_isapre × nº beneficiarios.
// Factores: Tabla Única de Factores (misma para todas las isapres).

import catalogos from "./catalogos.json";
import coberturas from "./coberturas.json";

const PDF_BASE = "https://nuevaisapre.cl/pdfs";

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
}
type Catalogos = Record<string, { label: string; ges_uf: number; planes: PlanRaw[] }>;
const CAT = catalogos as Catalogos;

interface PlanFull extends PlanRaw {
  isapre: string;
  isapreLabel: string;
  ges: number;
}
const ALL_PLANES: PlanFull[] = [];
for (const [slug, c] of Object.entries(CAT)) {
  for (const p of c.planes) {
    ALL_PLANES.push({ ...p, isapre: slug, isapreLabel: c.label, ges: c.ges_uf });
  }
}

interface TramoCobertura {
  pct: number;
  clinicas: string[];
}
// Cobertura por clínica, por isapre -> código. Solo donde es confiable
// (NMV metropolitano validado contra PDF; Esencial derivado del catálogo, que
// es exacto por ser red cerrada de cobertura uniforme).
const COBERTURAS = coberturas as Record<
  string,
  Record<string, { hosp: TramoCobertura[]; amb: TramoCobertura[]; amb_igual_hosp: boolean }>
>;

// Tabla Única de Factores por edad (cotizante / carga).
function factorCotizante(edad: number): number {
  if (edad <= 19) return 0.6;
  if (edad <= 24) return 0.9;
  if (edad <= 34) return 1.0;
  if (edad <= 44) return 1.3;
  if (edad <= 54) return 1.4;
  if (edad <= 64) return 2.0;
  return 2.4;
}
function factorCarga(edad: number): number {
  if (edad < 2) return 0; // las cargas se cobran desde los 2 años
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

// Región de cada clínica por substring del nombre. Cubre los prestadores de
// TODAS las isapres. "Clínica Alemana" sin sufijo = Santiago (Metropolitana);
// las regionales (Osorno, Temuco, Valdivia) se distinguen por su sufijo.
const REGION_RULES: [string, string][] = [
  ["renaca", "Valparaíso"],
  ["vina del mar", "Valparaíso"],
  ["ciudad del mar", "Valparaíso"],
  ["los leones", "Valparaíso"],
  ["los carrera", "Valparaíso"],
  ["redsalud valparaiso", "Valparaíso"],
  ["san jose", "Arica y Parinacota"],
  ["tarapaca", "Tarapacá"],
  ["iquique", "Tarapacá"],
  ["bupa antofagasta", "Antofagasta"],
  ["la portada", "Antofagasta"],
  ["el loa", "Antofagasta"],
  ["atacama", "Atacama"],
  ["elqui", "Coquimbo"],
  ["isamedica", "O'Higgins"],
  ["rancagua", "O'Higgins"],
  ["lircay", "Maule"],
  ["chillan", "Ñuble"],
  ["los andes (los", "Biobío"],
  ["biobio", "Biobío"],
  ["concepcion", "Biobío"],
  ["del sur", "Biobío"],
  ["temuco", "Araucanía"],
  ["valdivia", "Los Ríos"],
  ["puerto montt", "Los Lagos"],
  ["puerto varas", "Los Lagos"],
  ["osorno", "Los Lagos"],
  ["magallanes", "Magallanes"],
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
  ["las condes", "Metropolitana"], ["vitacura", "Metropolitana"], ["lo barnechea", "Metropolitana"],
  ["la reina", "Metropolitana"], ["macul", "Metropolitana"], ["penalolen", "Metropolitana"],
  ["san miguel", "Metropolitana"], ["recoleta", "Metropolitana"], ["independencia", "Metropolitana"],
  ["quilicura", "Metropolitana"], ["huechuraba", "Metropolitana"], ["colina", "Metropolitana"],
  ["conchali", "Metropolitana"], ["estacion central", "Metropolitana"], ["cerrillos", "Metropolitana"],
  ["pudahuel", "Metropolitana"], ["renca", "Metropolitana"], ["quinta normal", "Metropolitana"],
  ["san bernardo", "Metropolitana"], ["la cisterna", "Metropolitana"], ["el bosque", "Metropolitana"],
  ["san joaquin", "Metropolitana"], ["vitacura", "Metropolitana"], ["buin", "Metropolitana"],
  ["melipilla", "Metropolitana"], ["talagante", "Metropolitana"], ["padre hurtado", "Metropolitana"],
  ["vina", "Valparaíso"], ["valparaiso", "Valparaíso"], ["renaca", "Valparaíso"],
  ["quilpue", "Valparaíso"], ["villa alemana", "Valparaíso"], ["quillota", "Valparaíso"], ["concon", "Valparaíso"],
  ["arica", "Arica y Parinacota"],
  ["iquique", "Tarapacá"], ["tarapaca", "Tarapacá"], ["hospicio", "Tarapacá"],
  ["antofagasta", "Antofagasta"], ["calama", "Antofagasta"],
  ["copiapo", "Atacama"], ["atacama", "Atacama"], ["vallenar", "Atacama"],
  ["rancagua", "O'Higgins"], ["higgins", "O'Higgins"], ["san fernando", "O'Higgins"],
  ["talca", "Maule"], ["maule", "Maule"], ["curico", "Maule"], ["linares", "Maule"],
  ["concepcion", "Biobío"], ["biobio", "Biobío"], ["bio bio", "Biobío"], ["talcahuano", "Biobío"],
  ["los angeles", "Biobío"], ["coronel", "Biobío"],
  ["chillan", "Ñuble"], ["nuble", "Ñuble"],
  ["la serena", "Coquimbo"], ["coquimbo", "Coquimbo"], ["ovalle", "Coquimbo"], ["elqui", "Coquimbo"],
  ["puerto montt", "Los Lagos"], ["osorno", "Los Lagos"], ["los lagos", "Los Lagos"],
  ["puerto varas", "Los Lagos"], ["castro", "Los Lagos"], ["chiloe", "Los Lagos"],
  ["temuco", "Araucanía"], ["araucania", "Araucanía"], ["angol", "Araucanía"], ["villarrica", "Araucanía"],
  ["valdivia", "Los Ríos"], ["los rios", "Los Ríos"], ["la union", "Los Ríos"],
  ["punta arenas", "Magallanes"], ["magallanes", "Magallanes"], ["natales", "Magallanes"],
  ["coyhaique", "Aysén"], ["aysen", "Aysén"],
];
function normalizarRegion(txt: string): string | null {
  const n = normalizar(txt);
  for (const [k, r] of REGION_KEYWORDS) if (n.includes(k)) return r;
  return null;
}

// Texto libre de isapre -> slug.
const ISAPRE_KEYWORDS: [string, string][] = [
  ["masvida", "nuevamasvida"], ["nmv", "nuevamasvida"], ["nueva mas vida", "nuevamasvida"],
  ["banmedica", "banmedica"], ["consalud", "consalud"], ["colmena", "colmena"],
  ["cruz blanca", "cruzblanca"], ["cruzblanca", "cruzblanca"],
  ["vida tres", "vidatres"], ["vidatres", "vidatres"], ["vida 3", "vidatres"],
  ["esencial", "esencial"],
];
function matchIsapre(txt: string): string | null {
  const n = normalizar(txt);
  for (const [k, s] of ISAPRE_KEYWORDS) if (n.includes(k)) return s;
  return null;
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
  isapre: string;
  codigo: string;
  nombre: string;
  tipo: string;
  uf_base: number;
  cobertura_hospitalaria_pct: number;
  cobertura_ambulatoria_pct: number;
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
  cobertura_por_clinica: {
    hospitalaria: TramoCobertura[];
    ambulatoria: TramoCobertura[];
    ambulatoria_igual_hospitalaria: boolean;
  } | null;
}
export interface ResultadoCotizacion {
  isapre: string;
  cambio_de_isapre: boolean;
  valor_uf: number;
  cotizacion_7_pesos: number;
  cotizacion_7_fmt: string;
  aviso?: string;
  opciones: OpcionPlan[];
  nota: string;
}

interface PlanCalc extends PlanFull {
  precioUF: number;
  precioPesos: number;
}

function construirBeneficiarios(
  edad: number,
  cargas: Carga[],
  ufBase: number,
  ges: number,
  valorUF: number,
): Beneficiario[] {
  const lista: Beneficiario[] = [];
  const fCot = factorCotizante(edad);
  const ufCot = ufBase * fCot + ges;
  lista.push({
    rol: "Cotizante", edad, factor: fCot, uf: ufCot, uf_fmt: uf(ufCot),
    pesos: Math.round(ufCot * valorUF), pesos_fmt: pesos(ufCot * valorUF),
  });
  for (const c of cargas) {
    const f = factorCarga(c.edad);
    const ufc = f > 0 ? ufBase * f + ges : 0;
    lista.push({
      rol: "Carga", edad: c.edad, factor: f, uf: ufc, uf_fmt: uf(ufc),
      pesos: Math.round(ufc * valorUF), pesos_fmt: pesos(ufc * valorUF),
    });
  }
  return lista;
}

export function cotizar(
  edad: number,
  sueldoLiquido: number,
  cargas: Carga[],
  valorUF: number,
  clinicaPreferida?: string | null,
  region?: string | null,
  isapreSolicitada?: string | null,
  presupuestoMax?: number | null,
): ResultadoCotizacion {
  const cargasSafe = Array.isArray(cargas) ? cargas : [];
  const preferida = clinicaPreferida?.trim() ? clinicaPreferida.trim() : null;
  const regionBucket = region?.trim() ? normalizarRegion(region) : null;
  const slugSolicitado = isapreSolicitada?.trim() ? matchIsapre(isapreSolicitada) : null;

  const factorTotal =
    factorCotizante(edad) + cargasSafe.reduce((s, c) => s + factorCarga(c.edad), 0);
  const numBeneficiariosGES =
    1 + cargasSafe.filter((c) => factorCarga(c.edad) > 0).length;

  // El cliente entrega su sueldo LÍQUIDO; estimamos el bruto (÷0,8) y el 7%.
  const brutoEstimado = sueldoLiquido / 0.8;
  const target7 = brutoEstimado * 0.07;

  const precios: PlanCalc[] = ALL_PLANES.map((p) => {
    const precioUF = p.uf_base * factorTotal + p.ges * numBeneficiariosGES;
    return { ...p, precioUF, precioPesos: precioUF * valorUF };
  });

  const nq = preferida ? normalizar(preferida) : "";
  const quiereAlemanaStgo =
    !!preferida &&
    nq.includes("aleman") &&
    !/(osorno|temuco|valdivia)/.test(nq) &&
    (regionBucket === null || regionBucket === "Metropolitana");

  // Isapre a cotizar:
  //  - "Alemana Santiago" pedida -> Esencial (la única que la tiene).
  //  - Isapre solicitada por nombre -> esa isapre.
  //  - En cualquier otro caso: buscamos en LAS 7 ISAPRES y elegimos el mejor
  //    plan según el presupuesto del cliente (sin sesgo por isapre).
  let isapreLock: string | null = null;
  if (quiereAlemanaStgo) isapreLock = "esencial";
  else if (slugSolicitado) isapreLock = slugSolicitado;

  // Si quiere Alemana de Santiago, el filtro debe ser específico (no las Alemanas
  // regionales de Osorno/Temuco/Valdivia).
  const clinicaFiltro = quiereAlemanaStgo ? "Clínica Alemana de Santiago" : preferida;

  const filtro = (p: PlanCalc) =>
    (!regionBucket || planEnRegion(p, regionBucket)) &&
    (!clinicaFiltro || planMatcheaClinica(p, clinicaFiltro));

  // Ancla de selección: el presupuesto que dio el cliente, o el 7% legal.
  const target =
    presupuestoMax && presupuestoMax > 0 ? presupuestoMax : target7;

  let cambioIsapre = false;
  let aviso: string | undefined;
  let candidatos = isapreLock
    ? precios.filter((p) => p.isapre === isapreLock && filtro(p))
    : precios.filter(filtro);

  if (candidatos.length === 0) {
    // Sin candidatos: si la isapre estaba "lockeada", probamos cross-isapre.
    if (isapreLock) {
      const todos = precios.filter(filtro);
      if (todos.length > 0) {
        candidatos = todos;
        isapreLock = null;
        cambioIsapre = true;
        aviso =
          `La isapre pedida no calzaba con tu zona o clínica, ` +
          `así que busqué la mejor opción entre todas.`;
      }
    }
    if (candidatos.length === 0) {
      const dondeFalla = preferida
        ? `con la clínica indicada ("${preferida}")`
        : `en ${regionBucket ?? "tu zona"}`;
      return {
        isapre: isapreLock ? CAT[isapreLock].label : "—",
        cambio_de_isapre: false,
        valor_uf: valorUF,
        cotizacion_7_pesos: Math.round(target7),
        cotizacion_7_fmt: pesos(target7),
        aviso:
          `No encontré una red ${dondeFalla} en las isapres que manejo. ` +
          `Mejor te dejo con un ejecutivo del equipo para revisarlo caso a caso.`,
        opciones: [],
        nota: "",
      };
    }
  }

  // Línea de planes a anclar al presupuesto:
  //  - Si la isapre está lockeada en NMV, mantenemos PM/PS por afinidad.
  //  - Si está lockeada en otra, preferimos plans Preferente.
  //  - Si es cross-isapre, preferimos Preferente (más relevantes), si no, todo.
  let fuente = candidatos;
  if (isapreLock === "nuevamasvida") {
    const pm = candidatos.filter((p) => p.serie === "PM");
    const ps = candidatos.filter((p) => p.serie === "PS");
    const pmMin = pm.length ? Math.min(...pm.map((p) => p.precioPesos)) : Infinity;
    if (pm.length >= 3 && target >= pmMin) fuente = pm;
    else if (ps.length >= 3) fuente = ps;
    else {
      const pref = candidatos.filter((p) => p.tipo === "Preferente");
      fuente = pref.length >= 3 ? pref : candidatos;
    }
  } else {
    const pref = candidatos.filter((p) => p.tipo === "Preferente");
    fuente = pref.length >= 3 ? pref : candidatos;
  }

  // Selección anclada al 7%: ventana de 3 (más barato / cercano / más caro).
  const ordPrecio = [...fuente].sort((a, b) => a.precioPesos - b.precioPesos);
  let elegidos: PlanCalc[];
  if (ordPrecio.length >= 3 && target > 0) {
    let ai = 0;
    let mejorDif = Infinity;
    ordPrecio.forEach((p, i) => {
      const d = Math.abs(p.precioPesos - target);
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
    const beneficiarios = construirBeneficiarios(edad, cargasSafe, p.uf_base, p.ges, valorUF);
    const enRed = clinicaFiltro ? planMatcheaClinica(p, clinicaFiltro) : false;
    const det = COBERTURAS[p.isapre]?.[p.codigo];
    return {
      etiqueta: etiquetas[i],
      isapre: p.isapreLabel,
      codigo: p.codigo,
      nombre: p.nombre,
      tipo: p.tipo,
      uf_base: p.uf_base,
      cobertura_hospitalaria_pct: p.hosp_pct,
      cobertura_ambulatoria_pct: p.amb_pct,
      prestadores_hospitalarios: ordenarPorPreferida(p.prest_hosp || [], clinicaFiltro),
      prestadores_ambulatorios: ordenarPorPreferida(p.prest_amb || [], clinicaFiltro),
      clinica_preferida_en_red: enRed,
      beneficiarios,
      precio_uf: Number(p.precioUF.toFixed(3)),
      precio_uf_fmt: uf(p.precioUF),
      precio_pesos: Math.round(p.precioPesos),
      precio_pesos_fmt: pesos(p.precioPesos),
      excedente_pesos: Math.round(p.precioPesos - target7),
      excedente_fmt: pesos(p.precioPesos - target7),
      pdf_url: `${PDF_BASE}/${p.isapre}/${p.codigo}.pdf`,
      cobertura_por_clinica: det
        ? {
            hospitalaria: det.hosp,
            ambulatoria: det.amb,
            ambulatoria_igual_hospitalaria: det.amb.length === 0 && det.amb_igual_hosp,
          }
        : null,
    };
  });

  // Etiqueta de isapre a nivel resultado: si todas las opciones son de una
  // sola isapre, esa; si están mezcladas (búsqueda cross-isapre), "Varias".
  const isapresEnOpciones = new Set(opciones.map((o) => o.isapre));
  const isapreLabel =
    isapreLock ? CAT[isapreLock].label
    : isapresEnOpciones.size === 1 ? [...isapresEnOpciones][0]
    : "Varias";

  return {
    isapre: isapreLabel,
    cambio_de_isapre: cambioIsapre,
    valor_uf: valorUF,
    cotizacion_7_pesos: Math.round(target7),
    cotizacion_7_fmt: pesos(target7),
    aviso,
    opciones,
    nota:
      "Cobertura preferente: el % indicado aplica en las clínicas de la red del plan; " +
      "fuera de ellas rige la cobertura de libre elección. El detalle por clínica y los " +
      "topes están en el PDF de cada plan. El ejecutivo confirma todo al cierre.",
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
