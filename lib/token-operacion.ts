// Autenticación para operaciones fuera del panel (monitoreo y ajustes de
// reparto hechos por el equipo técnico): `Authorization: Bearer <token>` con
// el valor de ESTADO_ACCESOS_TOKEN.

import { timingSafeEqual } from "node:crypto";

export function autorizadoPorToken(req: Request): boolean {
  const esperado = process.env.ESTADO_ACCESOS_TOKEN || "";
  const recibido = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (esperado.length < 32 || recibido.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado));
}
