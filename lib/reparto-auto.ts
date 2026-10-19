// Reparto automático (round robin): cada lead NUEVO se asigna solo al
// siguiente ejecutivo en la rueda. Entran a la rueda los ejecutivos con
// "recibir leads" prendido y cupo disponible (créditos > 0); cada asignación
// descuenta 1 crédito, así que al agotar su cupo (20 al importarlo) el
// ejecutivo sale solo de la rueda hasta que el superadmin se lo reactive.
//
// Se prende/apaga desde /admin/reparto. Apagado (o sin nadie con cupo), el
// lead queda en la cola para reparto manual, como antes.

import { kvDel, kvGet, kvIncrBy, kvSet } from "./store";
import { listarUsuarios } from "./usuarios";
import { obtenerSaldo } from "./credits-kv";
import { asignarLead, type ResultadoReparto } from "./reparto";

const KEY_ACTIVO = "reparto:auto:activo";
const KEY_TURNO = "reparto:auto:turno";
const KEY_PRIO_EMAIL = "reparto:auto:prioridad:email";
const KEY_PRIO_RESTANTES = "reparto:auto:prioridad:restantes";
export const ACTOR_AUTOMATICO = "reparto-automatico";

export async function repartoAutomaticoActivo(): Promise<boolean> {
  return (await kvGet(KEY_ACTIVO)) === "1";
}

export async function setRepartoAutomatico(activo: boolean): Promise<void> {
  await kvSet(KEY_ACTIVO, activo ? "1" : "0", 0);
}

// Orden fijo (por fecha de creación) para que la rueda sea estable entre leads.
export async function ejecutivosEnRueda(): Promise<string[]> {
  const usuarios = (await listarUsuarios())
    .filter((u) => u.role === "ejecutivo" && u.recibiendoLeads)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.email.localeCompare(b.email));
  const saldos = await Promise.all(usuarios.map((u) => obtenerSaldo(u.email)));
  return usuarios.filter((_, i) => saldos[i] > 0).map((u) => u.email);
}

// Prioridad: los próximos `cantidad` leads van a un ejecutivo antes de seguir
// con la rueda (p. ej. para emparejar a alguien que entró tarde). No mueve el
// turno de la rueda: al terminar, sigue donde iba.
export interface Prioridad {
  email: string;
  restantes: number;
}

export async function setPrioridad(email: string, cantidad: number): Promise<void> {
  await kvSet(KEY_PRIO_EMAIL, email.trim().toLowerCase(), 0);
  await kvSet(KEY_PRIO_RESTANTES, String(cantidad), 0);
}

export async function quitarPrioridad(): Promise<void> {
  await kvDel(KEY_PRIO_EMAIL);
  await kvDel(KEY_PRIO_RESTANTES);
}

export async function obtenerPrioridad(): Promise<Prioridad | null> {
  const email = await kvGet(KEY_PRIO_EMAIL);
  const restantes = Number((await kvGet(KEY_PRIO_RESTANTES)) ?? 0);
  return email && restantes > 0 ? { email, restantes } : null;
}

// Intenta dar el lead al ejecutivo con prioridad. El DECR atómico reserva el
// cupo de prioridad; si la asignación falla (sin créditos, en pausa), se
// cancela la prioridad y el lead sigue a la rueda.
async function asignarPorPrioridad(leadId: string): Promise<ResultadoReparto | null> {
  const email = await kvGet(KEY_PRIO_EMAIL);
  if (!email) return null;
  const restantes = await kvIncrBy(KEY_PRIO_RESTANTES, -1);
  if (restantes < 0) {
    await quitarPrioridad();
    return null;
  }
  const r = await asignarLead(leadId, email, ACTOR_AUTOMATICO);
  if (r.ok) {
    if (restantes === 0) await quitarPrioridad();
    return r;
  }
  if (r.code === "ya_asignado" || r.code === "en_proceso" || r.code === "lead_no_encontrado") {
    await kvIncrBy(KEY_PRIO_RESTANTES, 1);
    return r;
  }
  await quitarPrioridad();
  return null;
}

// Devuelve null si no asignó (apagado, nadie con cupo, o el lead ya no está libre).
export async function asignarAutomatico(leadId: string): Promise<ResultadoReparto | null> {
  if (!(await repartoAutomaticoActivo())) return null;
  const prioritario = await asignarPorPrioridad(leadId);
  if (prioritario) return prioritario.ok ? prioritario : null;
  const rueda = await ejecutivosEnRueda();
  if (rueda.length === 0) return null;
  // INCR atómico: dos leads simultáneos toman turnos distintos.
  const turno = await kvIncrBy(KEY_TURNO, 1);
  for (let i = 0; i < rueda.length; i++) {
    const email = rueda[(turno - 1 + i) % rueda.length];
    const r = await asignarLead(leadId, email, ACTOR_AUTOMATICO);
    if (r.ok) return r;
    // Se quedó sin cupo o pausó entre medio: probar con el siguiente.
    if (r.code !== "sin_saldo" && r.code !== "no_recibe_leads" && r.code !== "ejecutivo_invalido") {
      return null;
    }
  }
  return null;
}
