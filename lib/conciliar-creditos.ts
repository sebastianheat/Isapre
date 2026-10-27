// Conciliación de créditos: cruza el saldo de cada ejecutivo con su historial
// y con los leads que de verdad tiene asignados en el panel.
//
// Saldo correcto = créditos recibidos (regalos y ajustes a favor) − leads que
// tiene asignados y que se le cobraron (asignacionCobrada). Las asignaciones
// sin costo (regalo) y las de antes de existir los créditos no descuentan.

import { listarMovimientos, obtenerSaldo } from "./credits-kv";
import { listarLeads, type Lead } from "./leads";
import { listarUsuarios } from "./usuarios";

export interface FilaConciliacion {
  email: string;
  nombre: string;
  saldoGuardado: number; // el número que muestra el panel
  saldoHistorial: number; // suma de su historial de movimientos
  recibidos: number; // regalos + ajustes a favor
  cobrosHistorial: number; // asignaciones cobradas según el historial (neto de devoluciones)
  leadsAsignados: number; // leads que hoy figuran a su nombre
  leadsCobrados: number; // de esos, cuántos se le cobraron
  saldoCorrecto: number; // recibidos − leadsCobrados (mínimo 0)
  diferencia: number; // saldoCorrecto − saldoGuardado
}

export function calcularFila(
  usuario: { email: string; nombre?: string },
  saldoGuardado: number,
  movimientos: { tipo: string; cantidad: number }[],
  leads: Lead[],
): FilaConciliacion {
  const email = usuario.email.toLowerCase();
  const suyos = leads.filter((l) => (l.asignadoA ?? "").toLowerCase() === email);
  const recibidos = movimientos
    .filter((m) => m.tipo === "regalo" || (m.tipo === "ajuste" && m.cantidad > 0))
    .reduce((a, m) => a + m.cantidad, 0);
  const cobrosHistorial = -movimientos
    .filter((m) => m.tipo === "asignacion" || m.tipo === "devolucion")
    .reduce((a, m) => a + m.cantidad, 0);
  const leadsCobrados = suyos.filter((l) => l.asignacionCobrada === true).length;
  const saldoCorrecto = Math.max(0, recibidos - leadsCobrados);
  return {
    email,
    nombre: usuario.nombre || email,
    saldoGuardado,
    saldoHistorial: movimientos.reduce((a, m) => a + m.cantidad, 0),
    recibidos,
    cobrosHistorial,
    leadsAsignados: suyos.length,
    leadsCobrados,
    saldoCorrecto,
    diferencia: saldoCorrecto - saldoGuardado,
  };
}

export async function conciliarCreditos(): Promise<FilaConciliacion[]> {
  const [usuarios, leads] = await Promise.all([listarUsuarios(), listarLeads(1000)]);
  const ejecutivos = usuarios.filter((u) => u.role === "ejecutivo");
  const filas = await Promise.all(
    ejecutivos.map(async (u) =>
      calcularFila(u, await obtenerSaldo(u.email), await listarMovimientos(u.email), leads),
    ),
  );
  return filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
