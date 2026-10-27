// Créditos de leads — versión mínima sobre KV (Fase 1 del marketplace).
//
// Saldo = entero en `credito:{email}:saldo` (INCRBY atómico). Historial =
// lista en `credito:{email}:movimientos`, más reciente primero. Cada
// movimiento guarda su `cantidad` con signo, así el saldo se puede recalcular
// desde el historial (US-010). NO es el ledger append-only de Postgres: se
// migra 1:1 a `credit_transactions` en la Fase 2.

import { kvGet, kvIncrBy, kvLPush, kvLRange } from "./store";

export type TipoMovimiento = "regalo" | "asignacion" | "devolucion" | "ajuste";

export interface MovimientoCredito {
  id: string;
  fecha: string; // ISO
  tipo: TipoMovimiento;
  cantidad: number; // con signo: +5 regalo, -1 asignación, +1 devolución, 0 asignación sin costo, ±N ajuste
  motivo: string;
  por: string; // email de quien ejecutó la acción
  leadId?: string;
}

function norm(email: string): string {
  return email.trim().toLowerCase();
}
const keySaldo = (email: string) => `credito:${norm(email)}:saldo`;
const keyMovs = (email: string) => `credito:${norm(email)}:movimientos`;

function nuevoId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export async function obtenerSaldo(email: string): Promise<number> {
  const raw = await kvGet(keySaldo(email));
  const n = Number(raw ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// Más reciente primero.
export async function listarMovimientos(email: string): Promise<MovimientoCredito[]> {
  const raw = await kvLRange(keyMovs(email), 0, -1);
  const movs: MovimientoCredito[] = [];
  for (const r of raw) {
    try {
      movs.push(JSON.parse(r) as MovimientoCredito);
    } catch {
      // entrada corrupta: se ignora en vez de romper la pantalla de auditoría
    }
  }
  return movs;
}

// Saldo calculado sumando el historial. Sirve para auditar que el contador
// y el historial no divergieron.
export async function recalcularSaldo(email: string): Promise<number> {
  const movs = await listarMovimientos(email);
  return movs.reduce((acc, m) => acc + m.cantidad, 0);
}

// Registra un movimiento en el historial SIN tocar el saldo (el saldo lo
// mueven las funciones de abajo con INCRBY). Exportado para el caso
// "asignación sin costo" (cantidad 0).
export async function registrarMovimiento(
  email: string,
  m: Omit<MovimientoCredito, "id" | "fecha">,
): Promise<MovimientoCredito> {
  const mov: MovimientoCredito = { ...m, id: nuevoId(), fecha: new Date().toISOString() };
  await kvLPush(keyMovs(email), JSON.stringify(mov));
  return mov;
}

export interface RegalarInput {
  email: string;
  cantidad: number;
  motivo: string;
  por: string;
}

export async function regalarCreditos(
  input: RegalarInput,
): Promise<{ saldo: number; movimiento: MovimientoCredito }> {
  const motivo = input.motivo.trim();
  if (!motivo) throw new Error("Escribe un motivo para este movimiento");
  if (!Number.isInteger(input.cantidad) || input.cantidad <= 0) {
    throw new Error("La cantidad debe ser un entero positivo");
  }
  const saldo = await kvIncrBy(keySaldo(input.email), input.cantidad);
  const movimiento = await registrarMovimiento(input.email, {
    tipo: "regalo",
    cantidad: input.cantidad,
    motivo,
    por: input.por,
  });
  return { saldo, movimiento };
}

interface CobroInput {
  motivo: string;
  por: string;
  leadId?: string;
}

// Descuenta 1 crédito por una asignación. Si el saldo quedaría negativo, lo
// revierte y devuelve ok:false (el decremento y la comprobación son atómicos:
// dos asignaciones simultáneas no pueden gastar el mismo último crédito).
export async function descontarCredito(
  email: string,
  input: CobroInput,
): Promise<{ ok: true; saldo: number } | { ok: false; saldo: number }> {
  const saldo = await kvIncrBy(keySaldo(email), -1);
  if (saldo < 0) {
    await kvIncrBy(keySaldo(email), 1);
    return { ok: false, saldo: saldo + 1 };
  }
  await registrarMovimiento(email, { tipo: "asignacion", cantidad: -1, ...input });
  return { ok: true, saldo };
}

// Devuelve 1 crédito (reasignación / corrección).
export async function devolverCredito(email: string, input: CobroInput): Promise<number> {
  const saldo = await kvIncrBy(keySaldo(email), 1);
  await registrarMovimiento(email, { tipo: "devolucion", cantidad: 1, ...input });
  return saldo;
}

// Deja el saldo en `saldo` exacto (conciliación). El movimiento de ajuste se
// calcula contra el historial, así historial y contador quedan iguales aunque
// hubieran divergido antes.
export async function ajustarSaldo(input: {
  email: string;
  saldo: number;
  motivo: string;
  por: string;
}): Promise<{ saldo: number; movimiento: MovimientoCredito | null }> {
  const motivo = input.motivo.trim();
  if (!motivo) throw new Error("Escribe un motivo para este ajuste");
  if (!Number.isInteger(input.saldo) || input.saldo < 0) {
    throw new Error("El saldo debe ser un entero mayor o igual a 0");
  }
  const [guardado, historial] = await Promise.all([obtenerSaldo(input.email), recalcularSaldo(input.email)]);
  if (guardado !== input.saldo) await kvIncrBy(keySaldo(input.email), input.saldo - guardado);
  const delta = input.saldo - historial;
  const movimiento =
    delta === 0
      ? null
      : await registrarMovimiento(input.email, { tipo: "ajuste", cantidad: delta, motivo, por: input.por });
  return { saldo: input.saldo, movimiento };
}
