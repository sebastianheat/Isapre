// Reparto manual de leads (Fase 1 del marketplace): asignar y reasignar un
// lead a un ejecutivo, descontando/devolviendo créditos.
//
// Vive aparte de lib/leads.ts (que ya está en el límite de 500 líneas). El
// lock `lock:asignacion:{leadId}` (kvMarcarUnaVez = SET NX) evita que dos
// acciones simultáneas asignen el mismo lead; es temporal: en la Fase 3 se
// reemplaza por SELECT ... FOR UPDATE en Postgres.

import { kvDel, kvMarcarUnaVez } from "./store";
import { actualizarLead, estadoAsignacion, obtenerLead, type Lead } from "./leads";
import { getUsuario, recibeLeads } from "./usuarios";
import { descontarCredito, devolverCredito, registrarMovimiento } from "./credits-kv";

const LOCK_TTL_SECONDS = 15;
const keyLock = (leadId: string) => `lock:asignacion:${leadId}`;

export type CodigoRechazo =
  | "lead_no_encontrado"
  | "ya_asignado"
  | "no_asignado"
  | "en_proceso"
  | "ejecutivo_invalido"
  | "no_recibe_leads"
  | "mismo_ejecutivo"
  | "sin_saldo";

export type ResultadoReparto =
  | { ok: true; lead: Lead; cobrado: boolean; saldo: number }
  | { ok: false; code: CodigoRechazo; mensaje: string; asignadoA?: string };

export interface OpcionesReparto {
  // Confirmación del "¿Asignar igual como regalo?": asigna sin descontar crédito.
  permitirSinSaldo?: boolean;
}

function rechazo(code: CodigoRechazo, mensaje: string, asignadoA?: string): ResultadoReparto {
  return { ok: false, code, mensaje, asignadoA };
}

async function nombreDe(email: string): Promise<string> {
  const u = await getUsuario(email).catch(() => null);
  return u?.nombre || email;
}

async function yaAsignado(lead: Lead): Promise<ResultadoReparto> {
  const email = lead.asignadoA ?? "";
  const nombre = email ? await nombreDe(email) : "otro ejecutivo";
  return rechazo("ya_asignado", `Este lead ya fue asignado a ${nombre}`, email || undefined);
}

function sinInterruptor(nombre: string): ResultadoReparto {
  return rechazo("no_recibe_leads", `${nombre} tiene pausada la recepción de leads`);
}

// Cobra la asignación al ejecutivo. Si no tiene saldo y se permitió, asigna
// sin costo y lo deja registrado (cantidad 0) para que el historial lo muestre.
async function cobrar(
  email: string,
  leadId: string,
  actor: string,
  motivo: string,
  permitirSinSaldo?: boolean,
): Promise<{ ok: true; cobrado: boolean; saldo: number } | { ok: false; saldo: number }> {
  const cobro = await descontarCredito(email, { motivo, por: actor, leadId });
  if (cobro.ok) return { ok: true, cobrado: true, saldo: cobro.saldo };
  if (!permitirSinSaldo) return { ok: false, saldo: cobro.saldo };
  await registrarMovimiento(email, {
    tipo: "asignacion",
    cantidad: 0,
    motivo: `${motivo} (sin saldo, asignado como regalo)`,
    por: actor,
    leadId,
  });
  return { ok: true, cobrado: false, saldo: cobro.saldo };
}

// Guarda el nuevo estado del lead; si falla, revierte el cobro ya hecho.
async function guardarAsignacion(
  leadId: string,
  email: string,
  cobrado: boolean,
  actor: string,
): Promise<Lead> {
  try {
    const lead = await actualizarLead(leadId, {
      asignadoA: email,
      assignmentStatus: "asignado",
      asignacionCobrada: cobrado,
    });
    if (!lead) throw new Error("Lead no encontrado al guardar la asignación");
    return lead;
  } catch (e) {
    if (cobrado) {
      await devolverCredito(email, { motivo: "reversa: falló la asignación", por: actor, leadId }).catch(
        (err) => console.error("No se pudo revertir el cobro de", email, leadId, err),
      );
    }
    throw e;
  }
}

// Toma el lock del lead y corre `fn`; siempre lo libera. Si el lock ya estaba
// tomado, otra acción sobre este mismo lead está en curso.
async function conLock(
  leadId: string,
  alFallar: () => Promise<ResultadoReparto>,
  fn: () => Promise<ResultadoReparto>,
): Promise<ResultadoReparto> {
  if (!(await kvMarcarUnaVez(keyLock(leadId), LOCK_TTL_SECONDS))) return await alFallar();
  try {
    return await fn();
  } finally {
    await kvDel(keyLock(leadId)).catch(() => {});
  }
}

const ENPROCESO = "Otra acción sobre este lead está en curso. Reintenta en unos segundos.";

export async function asignarLead(
  leadId: string,
  ejecutivoEmail: string,
  actor: string,
  opts: OpcionesReparto = {},
): Promise<ResultadoReparto> {
  return await conLock(
    leadId,
    async () => {
      // Perdió el lock: si la otra acción ya terminó, el lead ya está asignado.
      const l = await obtenerLead(leadId);
      return l && estadoAsignacion(l) === "asignado"
        ? await yaAsignado(l)
        : rechazo("en_proceso", ENPROCESO);
    },
    async () => {
      const lead = await obtenerLead(leadId);
      if (!lead) return rechazo("lead_no_encontrado", "Lead no encontrado");
      if (estadoAsignacion(lead) === "asignado") return await yaAsignado(lead);

      const ejecutivo = await getUsuario(ejecutivoEmail);
      if (!ejecutivo) return rechazo("ejecutivo_invalido", "El ejecutivo elegido no existe");
      if (!recibeLeads(ejecutivo)) return sinInterruptor(ejecutivo.nombre || ejecutivo.email);

      const cobro = await cobrar(ejecutivo.email, leadId, actor, "Asignación de lead", opts.permitirSinSaldo);
      if (!cobro.ok) {
        return rechazo("sin_saldo", "Este ejecutivo no tiene créditos. ¿Asignar igual como regalo?");
      }
      const guardado = await guardarAsignacion(leadId, ejecutivo.email, cobro.cobrado, actor);
      return { ok: true, lead: guardado, cobrado: cobro.cobrado, saldo: cobro.saldo };
    },
  );
}

// US-006b: corrige una asignación. Descuenta 1 crédito al nuevo ejecutivo y
// devuelve 1 al original (solo si a este se le había cobrado).
export async function reasignarLead(
  leadId: string,
  nuevoEmail: string,
  actor: string,
  opts: OpcionesReparto = {},
): Promise<ResultadoReparto> {
  return await conLock(leadId, async () => rechazo("en_proceso", ENPROCESO), async () => {
    const lead = await obtenerLead(leadId);
    if (!lead) return rechazo("lead_no_encontrado", "Lead no encontrado");
    const original = lead.asignadoA;
    if (estadoAsignacion(lead) !== "asignado" || !original) {
      return rechazo("no_asignado", "Este lead aún no está asignado: asígnalo desde Reparto");
    }

    const nuevo = await getUsuario(nuevoEmail);
    if (!nuevo) return rechazo("ejecutivo_invalido", "El ejecutivo elegido no existe");
    if (!recibeLeads(nuevo)) return sinInterruptor(nuevo.nombre || nuevo.email);
    if (nuevo.email.toLowerCase() === original.toLowerCase()) {
      return rechazo("mismo_ejecutivo", "El lead ya está asignado a ese ejecutivo", original);
    }

    // Orden: cobrar al nuevo → guardar el lead → devolver al original. Así un
    // fallo a mitad de camino nunca deja un crédito devuelto sin reasignación.
    const cobro = await cobrar(
      nuevo.email, leadId, actor, "corrección de asignación", opts.permitirSinSaldo,
    );
    if (!cobro.ok) {
      return rechazo("sin_saldo", "Este ejecutivo no tiene créditos. ¿Asignar igual como regalo?");
    }
    const guardado = await guardarAsignacion(leadId, nuevo.email, cobro.cobrado, actor);
    if (lead.asignacionCobrada) {
      await devolverCredito(original, { motivo: "corrección de asignación", por: actor, leadId });
    }
    return { ok: true, lead: guardado, cobrado: cobro.cobrado, saldo: cobro.saldo };
  });
}

// Código HTTP para cada rechazo (lo usan las rutas de /api/admin).
export function statusDeRechazo(code: CodigoRechazo): number {
  switch (code) {
    case "lead_no_encontrado": return 404;
    case "ejecutivo_invalido":
    case "no_recibe_leads":
    case "mismo_ejecutivo": return 400;
    case "sin_saldo": return 422;
    default: return 409; // ya_asignado, no_asignado, en_proceso
  }
}
