// Reimporta al panel leads que se capturaron pero no quedaron en la base
// (caída de Upstash del 24-10-2026). La fuente son los logs de Vercel: cada
// lead nuevo se loguea completo como "LEAD nuevo: {...}" y, si la base no
// respondió, como "LEAD SIN GUARDAR: {...}".
//
// Restaurar NO manda correo ni empuja a HEAT (eso ya ocurrió al capturarlo)
// y conserva la fecha original. Es idempotente: un lead que ya está en la
// base (mismo id, email, RUT o teléfono) no se toca.

import { kvSet, kvZAdd } from "./store";
import {
  buscarLeadExistente,
  guardarIndicesSecundarios,
  INDEX_KEY,
  LEAD_TTL_SECONDS,
  obtenerLead,
  type Lead,
} from "./leads";

const MARCAS = ["LEAD nuevo:", "LEAD SIN GUARDAR:"];

// Lee un objeto JSON que empieza en `desde` contando llaves (respeta strings).
function leerObjeto(texto: string, desde: number): string | null {
  let nivel = 0;
  let enString = false;
  for (let i = desde; i < texto.length; i++) {
    const c = texto[i];
    if (enString) {
      if (c === "\\") i++;
      else if (c === '"') enString = false;
    } else if (c === '"') enString = true;
    else if (c === "{") nivel++;
    else if (c === "}" && --nivel === 0) return texto.slice(desde, i + 1);
  }
  return null;
}

// Acepta un arreglo JSON de leads o texto pegado de los logs de Vercel.
export function extraerLeadsDeTexto(texto: string): Lead[] {
  const t = texto.trim();
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t) as unknown;
      if (Array.isArray(arr)) return arr.filter((x): x is Lead => !!x && typeof x === "object");
    } catch {
      // no era un arreglo válido: se intenta como texto de logs
    }
  }
  const leads: Lead[] = [];
  for (const marca of MARCAS) {
    let pos = t.indexOf(marca);
    while (pos !== -1) {
      const inicio = t.indexOf("{", pos);
      const json = inicio === -1 ? null : leerObjeto(t, inicio);
      if (json) {
        try {
          leads.push(JSON.parse(json) as Lead);
        } catch {
          // línea cortada: se ignora
        }
      }
      pos = t.indexOf(marca, pos + marca.length);
    }
  }
  return leads;
}

export interface ResultadoRestauracion {
  restaurados: Lead[];
  yaExistian: string[];
  descartados: string[];
}

export async function restaurarLeads(leads: Lead[], ahora = Date.now()): Promise<ResultadoRestauracion> {
  const r: ResultadoRestauracion = { restaurados: [], yaExistian: [], descartados: [] };
  for (const lead of leads) {
    const nombre = lead.nombre || lead.email || lead.telefono || "(sin nombre)";
    if (!lead.nombre || !(lead.telefono || lead.email)) {
      r.descartados.push(`${nombre}: falta nombre o contacto`);
      continue;
    }
    const fechaMs = Date.parse(lead.fecha ?? "");
    if (Number.isNaN(fechaMs)) {
      r.descartados.push(`${nombre}: sin fecha`);
      continue;
    }
    // Se respeta el plazo de conservación de 60 días contado desde la captura.
    const ttl = LEAD_TTL_SECONDS - Math.floor((ahora - fechaMs) / 1000);
    if (ttl <= 0) {
      r.descartados.push(`${nombre}: tiene más de 60 días`);
      continue;
    }
    const existente =
      (lead.id ? await obtenerLead(lead.id) : null) ??
      (await buscarLeadExistente({ email: lead.email, rut: lead.rut, telefono: lead.telefono }));
    if (existente) {
      r.yaExistian.push(nombre);
      continue;
    }
    const id = lead.id || `lead:${lead.telefono || lead.rut || "anon"}:${fechaMs}`;
    const registro: Lead = {
      ...lead,
      id,
      fecha: new Date(fechaMs).toISOString(),
      actualizado: lead.actualizado ?? new Date(fechaMs).toISOString(),
      contactos: lead.contactos ?? 1,
      asignadoA: undefined,
      assignmentStatus: "sin_asignar",
    };
    await kvSet(id, JSON.stringify(registro), ttl);
    await kvZAdd(INDEX_KEY, fechaMs, id);
    await guardarIndicesSecundarios(registro);
    r.restaurados.push(registro);
  }
  return r;
}

// Asignaciones pegadas a mano: una por línea, "correo del lead ; ejecutivo"
// (también sirve tabulador o coma, p. ej. copiado de Excel). El ejecutivo va
// por correo o por su nombre tal como está en Usuarios.
export function leerAsignaciones(texto: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const linea of texto.split(/\r?\n/)) {
    const partes = linea.split(/[;\t,]|->|→/).map((x) => x.trim()).filter(Boolean);
    if (partes.length < 2) continue;
    m.set(partes[0].toLowerCase(), partes[partes.length - 1]);
  }
  return m;
}
