// Solicitudes del admin (jefe de equipo) que el superadmin aprueba o rechaza.
// Hoy: pausar o reactivar a un vendedor ("recibir leads"). Nada cambia hasta
// que el superadmin aprueba.

import { kvGet, kvLPush, kvLRange, kvMarcarUnaVez, kvDel, kvSAdd, kvSMembers, kvSet, kvSRem } from "./store";
import { getUsuario, setRecibiendoLeads } from "./usuarios";
import { vende } from "./roles";

import type { Solicitud, TipoSolicitud } from "./solicitudes-tipos";
export type { Solicitud, TipoSolicitud, EstadoSolicitud } from "./solicitudes-tipos";
export { NOMBRE_TIPO } from "./solicitudes-tipos";

const KEY_PENDIENTES = "solicitudes:pendientes";
const KEY_HISTORIAL = "solicitudes:historial";
const key = (id: string) => `solicitud:${id}`;

type Resultado = { ok: true; solicitud: Solicitud } | { ok: false; status: number; error: string };
const falla = (status: number, error: string): Resultado => ({ ok: false, status, error });

async function guardar(s: Solicitud): Promise<void> {
  await kvSet(key(s.id), JSON.stringify(s), 0);
}

async function obtener(id: string): Promise<Solicitud | null> {
  const raw = await kvGet(key(id));
  return raw ? (JSON.parse(raw) as Solicitud) : null;
}

export async function crearSolicitud(
  por: string,
  input: { tipo?: unknown; email?: unknown; motivo?: unknown },
): Promise<Resultado> {
  const tipo = input.tipo === "pausar" || input.tipo === "reactivar" ? input.tipo : null;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const motivo = typeof input.motivo === "string" ? input.motivo.trim() : "";
  if (!tipo) return falla(400, "Tipo de solicitud inválido.");
  if (motivo.length < 5) return falla(400, "Cuenta brevemente el motivo.");
  const u = await getUsuario(email);
  if (!u || !vende(u.role)) return falla(400, "Ese vendedor no existe.");
  const pendientes = await listarPendientes();
  if (pendientes.some((s) => s.email === email)) {
    return falla(409, "Ya hay una solicitud pendiente para esa persona.");
  }
  const s: Solicitud = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    tipo,
    email,
    motivo,
    por: por.toLowerCase(),
    fecha: new Date().toISOString(),
    estado: "pendiente",
  };
  await guardar(s);
  await kvSAdd(KEY_PENDIENTES, s.id);
  return { ok: true, solicitud: s };
}

export async function resolverSolicitud(
  id: string,
  input: { aprobar: boolean; respuesta?: string; por: string },
): Promise<Resultado> {
  const respuesta = (input.respuesta ?? "").trim();
  if (!input.aprobar && respuesta.length < 5) return falla(400, "Escribe por qué la rechazas.");
  const lock = `lock:solicitud:${id}`;
  if (!(await kvMarcarUnaVez(lock, 15))) return falla(409, "Ya se está resolviendo. Reintenta en unos segundos.");
  try {
    const s = await obtener(id);
    if (!s) return falla(404, "Solicitud no encontrada.");
    if (s.estado !== "pendiente") return falla(409, "Esta solicitud ya fue resuelta.");
    if (input.aprobar) await setRecibiendoLeads(s.email, s.tipo === "reactivar");
    const final: Solicitud = {
      ...s,
      estado: input.aprobar ? "aprobada" : "rechazada",
      resueltaPor: input.por,
      resueltaEn: new Date().toISOString(),
      respuesta: respuesta || undefined,
    };
    await guardar(final);
    await kvSRem(KEY_PENDIENTES, id);
    await kvLPush(KEY_HISTORIAL, id);
    return { ok: true, solicitud: final };
  } finally {
    await kvDel(lock).catch(() => {});
  }
}

export async function listarPendientes(): Promise<Solicitud[]> {
  const out: Solicitud[] = [];
  for (const id of await kvSMembers(KEY_PENDIENTES)) {
    const s = await obtener(id);
    if (s?.estado === "pendiente") out.push(s);
    else await kvSRem(KEY_PENDIENTES, id);
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function listarResueltas(limite = 30): Promise<Solicitud[]> {
  const out: Solicitud[] = [];
  for (const id of await kvLRange(KEY_HISTORIAL, 0, limite - 1)) {
    const s = await obtener(id);
    if (s) out.push(s);
  }
  return out;
}
