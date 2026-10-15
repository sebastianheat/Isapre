// Prende/apaga el reparto automático round robin (solo superadmin).
// Body: { activo: boolean }

import { obtenerSesion } from "@/lib/auth";
import { setRepartoAutomatico } from "@/lib/reparto-auto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin puede cambiar el reparto." }, { status: 403 });
  }
  let body: { activo?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (typeof body.activo !== "boolean") {
    return Response.json({ error: "activo debe ser true o false" }, { status: 400 });
  }
  await setRepartoAutomatico(body.activo);
  return Response.json({ activo: body.activo });
}
