// Tipos de los planes pagados. Módulo client-safe (sin servidor).

export type EstadoPago = "pendiente" | "validado" | "rechazado";

export interface PagoPlan {
  id: string;
  email: string; // vendedor que lo pagó
  clienteNombre: string;
  clienteRut: string;
  fecha: string; // ISO
  estado: EstadoPago;
  revisadoPor?: string;
  revisadoEn?: string;
  motivo?: string; // si se rechazó
}

export interface EstadoCuenta {
  bloques: number; // bloques de 20 leads recibidos
  exigibles: number; // bloques que ya debe pagar
  validados: number; // planes pagados y validados
  enRevision: number; // planes registrados esperando validación
  debe: number; // planes que debe hoy
  alDia: boolean;
}

// Texto corto del estado para tablas y fichas.
export function textoEstado(e: EstadoCuenta): string {
  if (e.debe > 0) {
    const base = `Debe ${e.debe} plan${e.debe === 1 ? "" : "es"}`;
    return e.enRevision > 0 ? `${base} · ${e.enRevision} en revisión` : base;
  }
  return e.enRevision > 0 ? `OK · ${e.enRevision} en revisión` : "OK";
}
