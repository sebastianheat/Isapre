// Autenticación para operaciones fuera del panel (monitoreo, altas de
// usuarios y ajustes de reparto hechos por el equipo técnico):
// `Authorization: Bearer <token>` con el valor de ESTADO_ACCESOS_TOKEN o de
// OPERACION_TOKEN (variables de Vercel; si una no existe, no sirve).

import { timingSafeEqual } from "node:crypto";

function coincide(recibido: string, esperado: string): boolean {
  if (esperado.length < 32 || recibido.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado));
}

export function autorizadoPorToken(req: Request): boolean {
  const recibido = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return [process.env.ESTADO_ACCESOS_TOKEN, process.env.OPERACION_TOKEN].some((t) => coincide(recibido, t || ""));
}
