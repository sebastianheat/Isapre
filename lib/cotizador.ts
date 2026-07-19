// Motor de cotización multi-isapre.
// Usa los catálogos REALES de las 7 isapres (lib/catalogos.json, fuente tu7.cl).
// Por defecto cotiza Nueva Masvida; cambia de isapre según la necesidad del
// cliente (clínica preferida, región que NMV no cubre, o isapre solicitada).
//
// Fórmula: precioUF = uf_base × Σ(factores) + GES_isapre × nº beneficiarios.
// Factores: Tabla Única de Factores (misma para todas las isapres).

import catalogos from "./catalogos.json";
import coberturas from "./coberturas.json";

// Base de los PDFs oficiales por plan. Si está vacío, no incluimos el campo
// pdf_url en la respuesta — evita devolver links 404. Configurable por env
// para que apunte a donde sea que tengamos los PDFs hosteados.
const PDF_BASE = (process.env.PDF_BASE_URL ?? "").replace(/\/$/, "");

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
  // Nombre de archivo del PDF verificado en el hosting (catálogos 2026+).
  // null = se comprobó que NO existe; undefined = catálogo antiguo sin el
  // campo, en cuyo caso asumimos {codigo}.pdf como antes.
  pdf?: string | null;
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

// Normaliza el nombre de una cl\u00ednica para hacerlo comparable: saca el prefijo
// gen\u00e9rico ("Cl\u00ednica", "Hospital", "Hospital Cl\u00ednico", "Centro M\u00e9dico"),
// colapsa espacios, y devuelve tambi\u00e9n una variante SIN espacios para tolerar
// "Red Salud" vs "RedSalud", "MedSur" vs "Med Sur", etc.
function normalizarClinica(s: string): { full: string; compact: string } {
  const full = normalizar(s)
    .replace(/^(clinica|hospital|hospital clinico|centro medico|integramedica)\s+/u, "")
    .replace(/\s+/g, " ")
    .trim();
  return { full, compact: full.replace(/\s+/g, "") };
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

// Grupos de sinónimos: cuando el cliente menciona cualquier término del
// grupo, matchea con cualquier OTRO del mismo grupo. Útil porque la gente
// dice "Marcoleta" o "UC" en vez de "Hospital Clínico UC Christus", que
// es el nombre canónico que tenemos en el catálogo.
const ALIAS_GRUPOS: string[][] = [
  // UC Christus (campus Marcoleta y San Carlos de Apoquindo)
  [
    "uc christus",
    "ucchristus",
    "marcoleta",
    "uc marcoleta",
    "hospital clinico uc",
    "hospital uc",
    "clinica uc",
    "san carlos de apoquindo",
    "san carlos apoquindo",
  ],
  // Vidaintegra (centros médicos ambulatorios de Banmédica)
  ["vidaintegra", "vida integra"],
];

function tieneAlguno(texto: string, aliases: string[]): boolean {
  return aliases.some((a) => texto.includes(a));
}

// Compara nombres de clínica con tolerancia a:
//  - prefijos genéricos ("Clínica X", "Hospital X")
//  - variaciones de espacios ("Red Salud" vs "RedSalud")
//  - sinónimos locales chilenos ("Marcoleta" = "UC Christus")
//  - tildes y mayúsculas
function clinicaMatch(catalogo: string, query: string): boolean {
  const a = normalizarClinica(catalogo);
  const b = normalizarClinica(query);
  if (!a.full || !b.full) return false;
  // Match por substring (con y sin espacios).
  if (
    a.full.includes(b.full) ||
    b.full.includes(a.full) ||
    a.compact.includes(b.compact) ||
    b.compact.includes(a.compact)
  ) {
    return true;
  }
  // Match por sinónimo: si ambos lados caen en el mismo grupo, son la misma
  // institución aunque el nombre canónico difiera.
  for (const grupo of ALIAS_GRUPOS) {
    if (tieneAlguno(a.full, grupo) && tieneAlguno(b.full, grupo)) return true;
  }
  return false;
}

function ordenarPorPreferida(prest: string[], preferida: string | null): string[] {
  if (!preferida) return prest;
  return [...prest].sort(
    (a, b) => Number(clinicaMatch(b, preferida)) - Number(clinicaMatch(a, preferida)),
  );
}
function planMatcheaClinica(p: PlanRaw, preferida: string): boolean {
  return [...(p.prest_hosp || []), ...(p.prest_amb || [])].some((n) =>
    clinicaMatch(n, preferida),
  );
}

// Lista los labels de isapres que tienen la clínica preferida en al menos uno
// de sus planes (en cualquier red). Sirve para informarle al cliente cuando
// el filtro principal no encuentra esa clínica en preferente.
function isapresConClinica(preferida: string, excluir?: string | null): string[] {
  const labels = new Set<string>();
  for (const p of ALL_PLANES) {
    if (excluir && p.isapre === excluir) continue;
    if (planMatcheaClinica(p, preferida)) labels.add(p.isapreLabel);
  }
  return [...labels].sort();
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
  pdf_url: string | null;
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

  // Ancla de selección: el presupuesto que dio el cliente, o el 7% legal.
  const target =
    presupuestoMax && presupuestoMax > 0 ? presupuestoMax : target7;

  // Cascada de filtros: del más estricto al más laxo. Nunca devolvemos
  // opciones vacías. Si el cliente pidió una isapre por nombre, AGOTAMOS
  // primero los fallbacks DENTRO de esa isapre (soltamos clínica → soltamos
  // región) antes de cruzar a las otras 6 isapres. Para el cliente eso es lo
  // intuitivo: "mejores planes NMV con clínica X" debe devolver 3 NMV aunque
  // X no esté en preferente, no cambiar de isapre por sorpresa.
  let cambioIsapre = false;
  let aviso: string | undefined;

  function planesQueCumplen(opts: {
    region: string | null;
    clinica: string | null;
    isapre: string | null;
  }): PlanCalc[] {
    return precios.filter(
      (p) =>
        (!opts.isapre || p.isapre === opts.isapre) &&
        (!opts.region || planEnRegion(p, opts.region)) &&
        (!opts.clinica || planMatcheaClinica(p, opts.clinica)),
    );
  }

  // Nivel 1: todo (isapre lock + región + clínica). El caso ideal.
  let candidatos = planesQueCumplen({
    region: regionBucket,
    clinica: clinicaFiltro,
    isapre: isapreLock,
  });

  // Nivel 2 (solo si hay isapre lock): mantener la isapre, soltar la clínica.
  // Resultado típico: 3 planes de la isapre pedida en la región, con cobertura
  // de Libre Elección para la clínica pedida.
  if (candidatos.length === 0 && isapreLock && clinicaFiltro) {
    const sinClinicaMismaIsapre = planesQueCumplen({
      region: regionBucket,
      clinica: null,
      isapre: isapreLock,
    });
    if (sinClinicaMismaIsapre.length > 0) {
      candidatos = sinClinicaMismaIsapre;
      const otras = isapresConClinica(clinicaFiltro, isapreLock);
      const sufijo = otras.length
        ? ` ${otras.length === 1 ? "La que sí la incluye" : "Las que sí la incluyen"} en su red preferente: ${otras.join(", ")}.`
        : "";
      aviso =
        `${CAT[isapreLock].label} no incluye ${clinicaFiltro} en su red preferente. ` +
        `Te dejo 3 planes de ${CAT[isapreLock].label} en ${regionBucket ?? "tu zona"} ` +
        `donde igual puedes atenderte ahí con cobertura de Libre Elección.${sufijo}`;
    }
  }

  // Nivel 3 (solo si hay isapre lock): mantener la isapre, soltar región también.
  if (candidatos.length === 0 && isapreLock) {
    const soloIsapre = planesQueCumplen({
      region: null,
      clinica: null,
      isapre: isapreLock,
    });
    if (soloIsapre.length > 0) {
      candidatos = soloIsapre;
      aviso = aviso ??
        `${CAT[isapreLock].label} no tiene red preferente en ${regionBucket ?? "tu zona"}. ` +
        `Te dejo los 3 mejores planes de ${CAT[isapreLock].label} ajustados a tu presupuesto.`;
    }
  }

  // Nivel 4 (cross-isapre): si la isapre pedida no calzó ni siquiera con todo
  // suelto (raro), abrimos a las 7 isapres con la clínica/región original.
  if (candidatos.length === 0 && isapreLock) {
    const cross = planesQueCumplen({
      region: regionBucket,
      clinica: clinicaFiltro,
      isapre: null,
    });
    if (cross.length > 0) {
      candidatos = cross;
      cambioIsapre = true;
      aviso =
        `${CAT[isapreLock].label} no tiene planes disponibles para tus datos, ` +
        `así que busqué entre las 7 isapres y te dejo las mejores opciones.`;
      isapreLock = null;
    }
  }

  // Nivel 5 (cross-isapre sin isapre lock): si NO había isapre lockeada y el
  // filtro completo no encontró, soltamos clínica manteniendo región y avisamos
  // qué isapres SÍ tienen esa clínica.
  if (candidatos.length === 0 && clinicaFiltro) {
    const sinClinica = planesQueCumplen({
      region: regionBucket,
      clinica: null,
      isapre: null,
    });
    if (sinClinica.length > 0) {
      candidatos = sinClinica;
      const otras = isapresConClinica(clinicaFiltro, null);
      const sufijo = otras.length
        ? ` ${otras.length === 1 ? "La que sí la incluye" : "Las que sí la incluyen"} en su red preferente: ${otras.join(", ")}.`
        : "";
      aviso =
        `${clinicaFiltro} no aparece en la red preferente de ninguna isapre ` +
        `en ${regionBucket ?? "tu zona"}. Te muestro buenas opciones donde igual ` +
        `puedes atenderte ahí con cobertura de Libre Elección.${sufijo}`;
    }
  }

  // Nivel 6: ni región ni clínica encontraron nada. Soltamos región y mostramos
  // los mejores planes a nivel país, anclados al presupuesto.
  if (candidatos.length === 0) {
    candidatos = planesQueCumplen({
      region: null,
      clinica: null,
      isapre: null,
    });
    if (candidatos.length > 0 && (regionBucket || clinicaFiltro)) {
      const detalle = regionBucket && clinicaFiltro
        ? `tu zona ni ${clinicaFiltro}`
        : (regionBucket ?? clinicaFiltro);
      aviso = aviso ??
        `No encontré planes que calcen exactamente con ${detalle}. ` +
        `Te dejo las mejores 3 opciones ajustadas a tu presupuesto; ` +
        `el ejecutivo revisa el detalle por clínica al cierre.`;
    }
  }

  // Garantía final: si por alguna razón seguimos sin candidatos, devolvemos
  // los 3 planes más cercanos al 7% del catálogo completo. NUNCA opciones
  // vacías — el chat siempre cotiza algo.
  if (candidatos.length === 0) {
    candidatos = precios;
    aviso = aviso ??
      `Te dejo 3 opciones generales ajustadas a tu presupuesto; el ejecutivo ` +
      `revisa la cobertura específica de tu clínica y zona al cierre.`;
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
      pdf_url: (() => {
        const archivo = p.pdf === undefined ? `${p.codigo}.pdf` : p.pdf;
        return PDF_BASE && archivo ? `${PDF_BASE}/${p.isapre}/${archivo}` : null;
      })(),
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
