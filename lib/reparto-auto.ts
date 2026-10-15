// Reparto automático (round robin): cada lead NUEVO se asigna solo al
// siguiente ejecutivo en la rueda. Entran a la rueda los ejecutivos con
// "recibir leads" prendido y cupo disponible (créditos > 0); cada asignación
// descuenta 1 crédito, así que al agotar su cupo (20 al importarlo) el
// ejecutivo sale solo de la rueda hasta que el superadmin se lo reactive.
//
// Se prende/apaga desde /admin/reparto. Apagado (o sin nadie con cupo), el
// lead queda en la cola para reparto manual, como antes.

import { kvGet, kvIncrBy, kvSet } from "./store";
import { listarUsuarios } from "./usuarios";
import { obtenerSaldo } from "./credits-kv";
import { asignarLead, type ResultadoReparto } from "./reparto";

const KEY_ACTIVO = "reparto:auto:activo";
const KEY_TURNO = "reparto:auto:turno";
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

// Devuelve null si no asignó (apagado, nadie con cupo, o el lead ya no está libre).
export async function asignarAutomatico(leadId: string): Promise<ResultadoReparto | null> {
  if (!(await repartoAutomaticoActivo())) return null;
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
