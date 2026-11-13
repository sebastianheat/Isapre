// Planes pagados: por cada bloque de 20 créditos (leads) que recibe, el
// vendedor le paga al dueño con UN plan vendido. Lo registra él (nombre y RUT
// del cliente + foto del plan aceptado) y lo valida el superadmin o el admin
// ("Validar factura"). El admin no valida los suyos.
//
// Deuda (regla del dueño): al recibir su cupo ya debe 1 plan; desde el lead 21
// que le llega al panel debe el 2º, desde el 41 el 3º, etc. Cuentan los leads
// que de verdad le llegaron (asignaciones cobradas, menos las devueltas por
// reasignación o impugnación aceptada); los créditos regalados no cuentan.

import { listarMovimientos } from "./credits-kv";
import { kvDel, kvGet, kvLPush, kvLRange, kvMarcarUnaVez, kvSAdd, kvSMembers, kvSet, kvSRem } from "./store";
import { getUsuario, listarUsuarios } from "./usuarios";
import { vende, type Rol } from "./roles";
import { enviarPush, enviarPushARoles } from "./push";
import type { EstadoCuenta, PagoPlan } from "./planes-pagados-tipos";

export type { EstadoCuenta, PagoPlan } from "./planes-pagados-tipos";

export const LEADS_POR_PLAN = 20;
const MAX_FOTO = 900_000; // caracteres del data URL (~650 KB de imagen)

const keyPago = (id: string) => `pago:${id}`;
const keyFoto = (id: string) => `pago:foto:${id}`;
const keyLista = (email: string) => `pagos:${email.trim().toLowerCase()}`;
const KEY_PENDIENTES = "pagos:pendientes";

type Resultado = { ok: true; pago: PagoPlan } | { ok: false; status: number; error: string };
const falla = (status: number, error: string): Resultado => ({ ok: false, status, error });

// RUT chileno con dígito verificador (acepta puntos, guion y K).
export function rutValido(rut: string): boolean {
  const limpio = rut.replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const r = 11 - (suma % 11);
  const dv = r === 11 ? "0" : r === 10 ? "K" : String(r);
  return dv === limpio.slice(-1);
}

export function formatearRut(rut: string): string {
  const l = rut.replace(/[.\-\s]/g, "").toUpperCase();
  const cuerpo = l.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpo}-${l.slice(-1)}`;
}

// Cálculo puro de la cuenta del vendedor.
export function calcularEstado(entregados: number, tieneCupo: boolean, validados: number, enRevision: number): EstadoCuenta {
  const leads = Math.max(0, entregados);
  const bloques = Math.max(Math.ceil(leads / LEADS_POR_PLAN), tieneCupo ? 1 : 0);
  const debe = Math.max(0, bloques - validados);
  return { entregados: leads, bloques, exigibles: bloques, validados, enRevision, debe, alDia: debe === 0 };
}

export async function estadoCuenta(email: string): Promise<EstadoCuenta> {
  const [movs, pagos] = await Promise.all([listarMovimientos(email), listarPagosDe(email)]);
  // Leads que le llegaron: asignaciones cobradas (-1) menos devoluciones (+1).
  const entregados = -movs
    .filter((m) => m.tipo === "asignacion" || m.tipo === "devolucion")
    .reduce((a, m) => a + m.cantidad, 0);
  const tieneCupo = movs.some((m) => m.tipo === "regalo" && m.cantidad > 0);
  return calcularEstado(
    entregados,
    tieneCupo,
    pagos.filter((p) => p.estado === "validado").length,
    pagos.filter((p) => p.estado === "pendiente").length,
  );
}

async function guardar(p: PagoPlan): Promise<void> {
  await kvSet(keyPago(p.id), JSON.stringify(p), 0);
}

async function obtener(id: string): Promise<PagoPlan | null> {
  const raw = await kvGet(keyPago(id));
  return raw ? (JSON.parse(raw) as PagoPlan) : null;
}

export async function registrarPago(
  email: string,
  input: { clienteNombre?: unknown; clienteRut?: unknown; foto?: unknown },
): Promise<Resultado> {
  const nombre = typeof input.clienteNombre === "string" ? input.clienteNombre.trim() : "";
  const rut = typeof input.clienteRut === "string" ? input.clienteRut.trim() : "";
  const foto = typeof input.foto === "string" ? input.foto : "";
  if (nombre.length < 3) return falla(400, "Escribe el nombre del cliente.");
  if (!rutValido(rut)) return falla(400, "El RUT del cliente no es válido.");
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(foto)) return falla(400, "Adjunta una foto del plan aceptado.");
  if (foto.length > MAX_FOTO) return falla(400, "La foto es muy pesada. Intenta con otra o recórtala.");
  const u = await getUsuario(email);
  if (!u || !vende(u.role)) return falla(403, "Solo los vendedores registran planes pagados.");
  const p: PagoPlan = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    email: u.email.toLowerCase(),
    clienteNombre: nombre,
    clienteRut: formatearRut(rut),
    fecha: new Date().toISOString(),
    estado: "pendiente",
  };
  await kvSet(keyFoto(p.id), foto, 0);
  await guardar(p);
  await kvLPush(keyLista(p.email), p.id);
  await kvSAdd(KEY_PENDIENTES, p.id);
  await enviarPushARoles(
    ["superadmin", "admin"],
    {
      titulo: "🧾 Plan pagado por validar",
      cuerpo: `${u.nombre || u.email}: ${nombre}`,
      url: `/admin/creditos/${encodeURIComponent(p.email)}#planes`,
      tag: "pagos",
    },
    p.email,
  ).catch(() => {});
  return { ok: true, pago: p };
}

export async function validarPago(
  id: string,
  input: { aprobar: boolean; motivo?: string; por: string; rol: Rol },
): Promise<Resultado> {
  if (input.rol !== "superadmin" && input.rol !== "admin") return falla(403, "Solo el superadmin o el administrador validan.");
  const motivo = (input.motivo ?? "").trim();
  if (!input.aprobar && motivo.length < 5) return falla(400, "Escribe por qué lo rechazas: el vendedor lo va a ver.");
  const lock = `lock:pago:${id}`;
  if (!(await kvMarcarUnaVez(lock, 15))) return falla(409, "Se está validando. Reintenta en unos segundos.");
  try {
    const p = await obtener(id);
    if (!p) return falla(404, "Registro no encontrado.");
    if (p.estado !== "pendiente") return falla(409, "Este plan ya fue revisado.");
    if (input.rol === "admin" && p.email === input.por.toLowerCase()) {
      return falla(403, "Tus propios planes los valida el superadmin.");
    }
    const final: PagoPlan = {
      ...p,
      estado: input.aprobar ? "validado" : "rechazado",
      revisadoPor: input.por,
      revisadoEn: new Date().toISOString(),
      motivo: input.aprobar ? undefined : motivo,
    };
    await guardar(final);
    await kvSRem(KEY_PENDIENTES, id);
    await enviarPush(p.email, {
      titulo: input.aprobar ? "✅ Plan pagado validado" : "❌ Plan pagado rechazado",
      cuerpo: input.aprobar ? `${p.clienteNombre}: quedó registrado.` : `${p.clienteNombre}: ${motivo}`,
      url: "/admin/mis-creditos",
      tag: `pago-${id}`,
    }).catch(() => {});
    return { ok: true, pago: final };
  } finally {
    await kvDel(lock).catch(() => {});
  }
}

export async function listarPagosDe(email: string): Promise<PagoPlan[]> {
  const out: PagoPlan[] = [];
  for (const id of await kvLRange(keyLista(email), 0, -1)) {
    const p = await obtener(id);
    if (p) out.push(p);
  }
  return out;
}

export async function fotoDePago(id: string): Promise<{ pago: PagoPlan; foto: string } | null> {
  const [pago, foto] = await Promise.all([obtener(id), kvGet(keyFoto(id))]);
  return pago && foto ? { pago, foto } : null;
}

// Pendientes de validación que puede ver este usuario (el admin no ve los suyos).
export async function contarPorValidar(email: string, rol: Rol): Promise<number> {
  if (rol !== "superadmin" && rol !== "admin") return 0;
  let n = 0;
  for (const id of await kvSMembers(KEY_PENDIENTES)) {
    const p = await obtener(id);
    if (p?.estado !== "pendiente") {
      await kvSRem(KEY_PENDIENTES, id);
      continue;
    }
    if (rol === "admin" && p.email === email.toLowerCase()) continue;
    n++;
  }
  return n;
}

// Estado de cuenta de todos los vendedores (para la tabla de Créditos).
export async function estadosDeVendedores(): Promise<Record<string, EstadoCuenta>> {
  const vendedores = (await listarUsuarios()).filter((u) => vende(u.role));
  const pares = await Promise.all(vendedores.map(async (u) => [u.email.toLowerCase(), await estadoCuenta(u.email)] as const));
  return Object.fromEntries(pares);
}
