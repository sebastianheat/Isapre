// Reparto automático (round robin): cada lead NUEVO se asigna solo al
// siguiente vendedor en la rueda (ejecutivos y el admin, que también vende). Entran a la rueda los ejecutivos con
// "recibir leads" prendido y cupo disponible (créditos > 0); cada asignación
// descuenta 1 crédito, así que al agotar su cupo (20 al importarlo) el
// ejecutivo sale solo de la rueda hasta que el superadmin se lo reactive.
//
// Se prende/apaga desde /admin/reparto. Apagado (o sin nadie con cupo), el
// lead queda en la cola para reparto manual, como antes.
//
// El turno se guarda como "a quién le tocó el último" (no como un número):
// el siguiente es el que viene después en el orden fijo. Antes era un
// contador módulo el largo de la rueda, y cada vez que alguien entraba o
// salía (cupo agotado, pausa, usuario nuevo) el turno saltaba y algunos
// perdían su vuelta.

import { kvDel, kvGet, kvIncrBy, kvMarcarUnaVez, kvSet } from "./store";
import { listarUsuarios } from "./usuarios";
import { vende } from "./roles";
import { obtenerSaldo } from "./credits-kv";
import { asignarLead, type ResultadoReparto } from "./reparto";

const KEY_ACTIVO = "reparto:auto:activo";
const KEY_ULTIMO = "reparto:auto:ultimo"; // email del último que recibió por rueda
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
    .filter((u) => vende(u.role) && u.recibiendoLeads)
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
  // Dos leads simultáneos no deben leer el mismo "último": se serializa la
  // elección del turno con un candado corto.
  const LOCK = "lock:reparto:turno";
  let tengoLock = false;
  for (let intento = 0; intento < 20; intento++) {
    if ((tengoLock = await kvMarcarUnaVez(LOCK, 10))) break;
    await new Promise((r) => setTimeout(r, 150));
  }
  try {
    const inicio = siguienteEnRueda(rueda, await ordenCompleto(), await kvGet(KEY_ULTIMO));
    for (let i = 0; i < rueda.length; i++) {
      const email = rueda[(inicio + i) % rueda.length];
      const r = await asignarLead(leadId, email, ACTOR_AUTOMATICO);
      if (r.ok) {
        await kvSet(KEY_ULTIMO, email, 0);
        return r;
      }
      // Se quedó sin cupo o pausó entre medio: probar con el siguiente.
      if (r.code !== "sin_saldo" && r.code !== "no_recibe_leads" && r.code !== "ejecutivo_invalido") {
        return null;
      }
    }
    return null;
  } finally {
    if (tengoLock) await kvDel(LOCK).catch(() => {});
  }
}

// Orden fijo de TODOS los vendedores (estén o no en la rueda ahora), para
// ubicar al "último" aunque haya salido de la rueda.
async function ordenCompleto(): Promise<string[]> {
  return (await listarUsuarios())
    .filter((u) => vende(u.role))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.email.localeCompare(b.email))
    .map((u) => u.email);
}

// Índice en `rueda` del que sigue después de `ultimo` según el orden fijo.
// Si `ultimo` ya no está en la rueda, sigue el próximo que sí esté.
export function siguienteEnRueda(rueda: string[], orden: string[], ultimo: string | null): number {
  if (!ultimo || rueda.length === 0) return 0;
  const pos = orden.indexOf(ultimo);
  if (pos === -1) return 0;
  for (let i = 1; i <= orden.length; i++) {
    const idx = rueda.indexOf(orden[(pos + i) % orden.length]);
    if (idx !== -1) return idx;
  }
  return 0;
}
