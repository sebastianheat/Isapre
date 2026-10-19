// Prioridad del reparto automático: los próximos `cantidad` leads van a un
// ejecutivo antes de seguir la rueda. Body: { email, cantidad } (cantidad 0
// quita la prioridad). Superadmin con sesión o token de operación.

import { obtenerSesion } from "@/lib/auth";
import { getUsuario } from "@/lib/usuarios";
import { autorizadoPorToken } from "@/lib/token-operacion";
import { obtenerPrioridad, quitarPrioridad, setPrioridad } from "@/lib/reparto-auto";

export const runtime = "nodejs";

const MAX_CANTIDAD = 50;

async function autorizado(req: Request): Promise<boolean> {
  if (autorizadoPorToken(req)) return true;
  const sesion = await obtenerSesion();
  return sesion?.role === "superadmin";
}

export async function POST(req: Request) {
  if (!(await autorizado(req))) return Response.json({ error: "No autorizado" }, { status: 401 });
  let body: { email?: unknown; cantidad?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const cantidad = body.cantidad;
  if (typeof cantidad !== "number" || !Number.isInteger(cantidad) || cantidad < 0 || cantidad > MAX_CANTIDAD) {
    return Response.json({ error: `La cantidad debe ser un entero entre 0 y ${MAX_CANTIDAD}` }, { status: 400 });
  }
  if (cantidad === 0) {
    await quitarPrioridad();
    return Response.json({ prioridad: null });
  }
  if (typeof body.email !== "string" || !body.email.trim()) {
    return Response.json({ error: "Elige un ejecutivo" }, { status: 400 });
  }
  const u = await getUsuario(body.email);
  if (!u || u.role !== "ejecutivo") {
    return Response.json({ error: "El ejecutivo elegido no existe" }, { status: 400 });
  }
  await setPrioridad(u.email, cantidad);
  return Response.json({ prioridad: await obtenerPrioridad() });
}
