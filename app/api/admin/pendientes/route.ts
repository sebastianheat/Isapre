// Lo que el usuario tiene por revisar (aviso amarillo del panel).
// superadmin: impugnaciones pendientes + solicitudes del admin.
// admin: impugnaciones que esperan su primera aprobación.
// Ambos: planes pagados por validar.

import { obtenerSesion } from "@/lib/auth";
import { contarPendientes, contarSinRevisar } from "@/lib/impugnaciones";
import { listarPendientes } from "@/lib/solicitudes";
import { contarPorValidar } from "@/lib/planes-pagados";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role === "superadmin") {
    return Response.json({
      impugnaciones: await contarPendientes(),
      solicitudes: (await listarPendientes()).length,
      pagos: await contarPorValidar(sesion.email, sesion.role),
    });
  }
  if (sesion.role === "admin") {
    return Response.json({
      impugnaciones: await contarSinRevisar(),
      solicitudes: 0,
      pagos: await contarPorValidar(sesion.email, sesion.role),
    });
  }
  return Response.json({ impugnaciones: 0, solicitudes: 0 });
}
