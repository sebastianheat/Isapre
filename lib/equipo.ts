// Resumen por vendedor para la sección "Equipo" de Métricas (superadmin y
// admin): cuánto recibió cada uno y en qué está su cartera.

import type { Lead } from "./leads";

export interface FilaEquipo {
  email: string;
  nombre: string;
  asignados: number;
  ultimos7: number; // recibidos en los últimos 7 días
  sinContactar: number; // siguen en "Nuevo"
  enGestion: number; // contactando, cotizado, pendiente o agendado
  ganados: number;
  perdidos: number;
  recordatoriosVencidos: number;
  saldo: number;
  ultimoIngreso?: string;
}

const GESTION = new Set(["contactando", "cotizado", "pendiente", "agendado"]);

export function resumenEquipo(
  vendedores: { email: string; nombre?: string; saldo: number; ultimoIngreso?: string }[],
  leads: Lead[],
  ahora = Date.now(),
): FilaEquipo[] {
  const hace7 = ahora - 7 * 24 * 60 * 60 * 1000;
  return vendedores
    .map((v) => {
      const email = v.email.toLowerCase();
      const suyos = leads.filter((l) => (l.asignadoA ?? "").toLowerCase() === email && !l.falso);
      const etapa = (l: Lead) => l.etapa ?? "nuevo";
      return {
        email,
        nombre: v.nombre || v.email,
        asignados: suyos.length,
        ultimos7: suyos.filter((l) => l.fecha && Date.parse(l.fecha) >= hace7).length,
        sinContactar: suyos.filter((l) => etapa(l) === "nuevo").length,
        enGestion: suyos.filter((l) => GESTION.has(etapa(l))).length,
        ganados: suyos.filter((l) => etapa(l) === "ganado").length,
        perdidos: suyos.filter((l) => etapa(l) === "perdido").length,
        recordatoriosVencidos: suyos.reduce(
          (n, l) => n + (l.recordatorios ?? []).filter((r) => !r.notificado && Date.parse(r.fecha) < ahora).length,
          0,
        ),
        saldo: v.saldo,
        ultimoIngreso: v.ultimoIngreso,
      };
    })
    .sort((a, b) => b.asignados - a.asignados || a.nombre.localeCompare(b.nombre, "es"));
}
