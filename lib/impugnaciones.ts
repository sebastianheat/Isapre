// Impugnación de leads falsos.
//
// El ejecutivo al que se le asignó un lead puede impugnarlo SOLO si el
// teléfono es falso y además el nombre o el correo (motivosValidos). El
// superadmin la acepta o la rechaza:
// - Aceptada: se le devuelve el crédito al ejecutivo (si se le cobró y el lead
//   sigue siendo suyo) y el lead queda marcado como falso (perdido, no calificado).
// - Rechazada: el lead sigue igual; el ejecutivo ve el motivo.
// Mientras está pendiente, el ejecutivo puede retirarla (p. ej. si el cliente
// le contestó: entonces no era falso).
//
// Se usa el mismo lock que el reparto (`lock:asignacion:{leadId}`), así una
// impugnación no se cruza con una reasignación del mismo lead.

import { devolverCredito } from "./credits-kv";
import { enviarImpugnacionNueva, enviarImpugnacionResuelta } from "./email";
import { LEAD_TTL_SECONDS, obtenerLead, type Lead } from "./leads";
import { motivosValidos, type ImpugnacionLead, type MotivoImpugnacion, type NotaLead } from "./pipeline";
import { kvDel, kvLPush, kvLRange, kvMarcarUnaVez, kvSAdd, kvSMembers, kvSet, kvSRem } from "./store";
import { getUsuario } from "./usuarios";

const KEY_PENDIENTES = "impugnaciones:pendientes";
const KEY_HISTORIAL = "impugnaciones:historial";
const MOTIVOS: MotivoImpugnacion[] = ["telefono", "nombre", "correo"];

export type Resultado = { ok: true; lead: Lead } | { ok: false; status: number; error: string };

const falla = (status: number, error: string): Resultado => ({ ok: false, status, error });
const mismo = (a?: string, b?: string) => (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

async function conLock(leadId: string, fn: () => Promise<Resultado>): Promise<Resultado> {
  const key = `lock:asignacion:${leadId}`;
  if (!(await kvMarcarUnaVez(key, 15))) return falla(409, "Otra acción sobre este lead está en curso. Reintenta en unos segundos.");
  try {
    return await fn();
  } finally {
    await kvDel(key).catch(() => {});
  }
}

function nota(texto: string, autor: string): NotaLead {
  return { id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, texto, fecha: new Date().toISOString(), autor };
}

async function guardar(lead: Lead): Promise<Lead> {
  const final = { ...lead, actualizado: new Date().toISOString() };
  await kvSet(final.id ?? "", JSON.stringify(final), LEAD_TTL_SECONDS);
  return final;
}

export async function impugnarLead(
  leadId: string,
  ejecutivoEmail: string,
  input: { motivos?: unknown; comentario?: unknown },
): Promise<Resultado> {
  const motivos = Array.isArray(input.motivos)
    ? MOTIVOS.filter((m) => (input.motivos as unknown[]).includes(m))
    : [];
  const comentario = typeof input.comentario === "string" ? input.comentario.trim() : "";
  if (!motivosValidos(motivos)) {
    return falla(400, "Solo se puede impugnar si el teléfono es falso y además el nombre o el correo.");
  }
  if (comentario.length < 10) {
    return falla(400, "Cuenta qué hiciste para comprobarlo (ej. “el número no tiene WhatsApp y no existe”).");
  }
  const resultado = await conLock(leadId, async () => {
    const lead = await obtenerLead(leadId);
    if (!lead) return falla(404, "Lead no encontrado");
    if (!mismo(lead.asignadoA, ejecutivoEmail)) return falla(403, "Solo puedes impugnar leads asignados a ti.");
    if (lead.falso) return falla(409, "Este lead ya fue marcado como falso.");
    if (lead.impugnacion?.estado === "pendiente") return falla(409, "Este lead ya tiene una impugnación pendiente.");
    if (lead.impugnacion?.estado === "rechazada") return falla(409, "La impugnación de este lead ya fue rechazada.");
    const impugnacion: ImpugnacionLead = {
      estado: "pendiente",
      motivos,
      comentario,
      por: ejecutivoEmail.trim().toLowerCase(),
      fecha: new Date().toISOString(),
    };
    const guardado = await guardar({ ...lead, impugnacion });
    await kvSAdd(KEY_PENDIENTES, leadId);
    return { ok: true, lead: guardado };
  });
  if (resultado.ok) {
    const u = await getUsuario(ejecutivoEmail).catch(() => null);
    await enviarImpugnacionNueva(resultado.lead, u?.nombre || ejecutivoEmail).catch((e) =>
      console.error("Aviso de impugnación falló:", leadId, e),
    );
  }
  return resultado;
}

export async function retirarImpugnacion(leadId: string, ejecutivoEmail: string): Promise<Resultado> {
  return await conLock(leadId, async () => {
    const lead = await obtenerLead(leadId);
    if (!lead) return falla(404, "Lead no encontrado");
    const imp = lead.impugnacion;
    if (!imp || imp.estado !== "pendiente") return falla(409, "No hay una impugnación pendiente para retirar.");
    if (!mismo(imp.por, ejecutivoEmail)) return falla(403, "Solo quien impugnó puede retirarla.");
    const guardado = await guardar({
      ...lead,
      impugnacion: { ...imp, estado: "retirada", resueltaPor: imp.por, resueltaEn: new Date().toISOString() },
    });
    await kvSRem(KEY_PENDIENTES, leadId);
    await kvLPush(KEY_HISTORIAL, leadId);
    return { ok: true, lead: guardado };
  });
}

export async function resolverImpugnacion(
  leadId: string,
  input: { aceptar: boolean; respuesta?: string; por: string },
): Promise<Resultado> {
  const respuesta = (input.respuesta ?? "").trim();
  if (!input.aceptar && respuesta.length < 5) return falla(400, "Escribe por qué la rechazas: el ejecutivo lo va a ver.");
  const resultado = await conLock(leadId, async () => {
    const lead = await obtenerLead(leadId);
    if (!lead) return falla(404, "Lead no encontrado");
    const imp = lead.impugnacion;
    if (!imp || imp.estado !== "pendiente") return falla(409, "Esta impugnación ya no está pendiente.");
    const ahora = new Date().toISOString();

    if (!input.aceptar) {
      const guardado = await guardar({
        ...lead,
        impugnacion: { ...imp, estado: "rechazada", resueltaPor: input.por, resueltaEn: ahora, respuesta },
        notas: [...(lead.notas ?? []), nota(`🚩 Impugnación rechazada: ${respuesta}`, input.por)],
      });
      return { ok: true, lead: guardado };
    }

    // Se devuelve el crédito solo si el lead sigue siendo de quien impugnó y
    // esa asignación se le cobró (un lead regalado no descontó nada).
    const devolver = mismo(lead.asignadoA, imp.por) && lead.asignacionCobrada === true;
    if (devolver) {
      await devolverCredito(imp.por, { motivo: "Impugnación aceptada: lead falso", por: input.por, leadId });
    }
    const guardado = await guardar({
      ...lead,
      falso: true,
      etapa: "perdido",
      calidad: "no_calificado",
      asignacionCobrada: devolver ? false : lead.asignacionCobrada,
      impugnacion: {
        ...imp,
        estado: "aceptada",
        resueltaPor: input.por,
        resueltaEn: ahora,
        respuesta: respuesta || undefined,
        creditoDevuelto: devolver,
      },
      notas: [
        ...(lead.notas ?? []),
        nota(`🚩 Lead falso: impugnación aceptada${devolver ? ", crédito devuelto" : ""}.${respuesta ? ` ${respuesta}` : ""}`, input.por),
      ],
    });
    return { ok: true, lead: guardado };
  });
  if (resultado.ok) {
    await kvSRem(KEY_PENDIENTES, leadId);
    await kvLPush(KEY_HISTORIAL, leadId);
    const imp = resultado.lead.impugnacion!;
    const u = await getUsuario(imp.por).catch(() => null);
    await enviarImpugnacionResuelta(resultado.lead, { email: imp.por, nombre: u?.nombre }).catch((e) =>
      console.error("Aviso de impugnación resuelta falló:", leadId, e),
    );
  }
  return resultado;
}

export async function contarPendientes(): Promise<number> {
  return (await kvSMembers(KEY_PENDIENTES)).length;
}

// Pendientes (más antigua primero) y las últimas resueltas (más reciente primero).
export async function listarImpugnaciones(): Promise<{ pendientes: Lead[]; resueltas: Lead[] }> {
  const pendientes: Lead[] = [];
  for (const id of await kvSMembers(KEY_PENDIENTES)) {
    const l = await obtenerLead(id);
    if (l?.impugnacion?.estado === "pendiente") pendientes.push(l);
    else await kvSRem(KEY_PENDIENTES, id); // venció o ya no está pendiente
  }
  pendientes.sort((a, b) => (a.impugnacion?.fecha ?? "").localeCompare(b.impugnacion?.fecha ?? ""));

  const vistos = new Set<string>();
  const resueltas: Lead[] = [];
  for (const id of await kvLRange(KEY_HISTORIAL, 0, 99)) {
    if (vistos.has(id) || resueltas.length >= 30) continue;
    vistos.add(id);
    const l = await obtenerLead(id);
    if (l?.impugnacion && l.impugnacion.estado !== "pendiente") resueltas.push(l);
  }
  return { pendientes, resueltas };
}
