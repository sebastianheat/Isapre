// Planes pagados (cada 20 leads = 1 plan).
// GET ?email=: registros y estado de cuenta (el vendedor, solo los suyos).
// POST { accion: "registrar", clienteNombre, clienteRut, foto }: el vendedor.
// POST { accion: "validar", id, aprobar, motivo? }: superadmin o admin.

import { obtenerSesion } from "@/lib/auth";
import { estadoCuenta, listarPagosDe, registrarPago, validarPago } from "@/lib/planes-pagados";
import { veTodo } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  const pedido = (new URL(req.url).searchParams.get("email") || sesion.email).toLowerCase();
  if (pedido !== sesion.email.toLowerCase() && !veTodo(sesion.role)) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }
  return Response.json({ pagos: await listarPagosDe(pedido), estado: await estadoCuenta(pedido) });
}

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const r =
    body.accion === "registrar"
      ? await registrarPago(sesion.email, body)
      : body.accion === "validar" && typeof body.id === "string" && typeof body.aprobar === "boolean"
        ? await validarPago(body.id, {
            aprobar: body.aprobar,
            motivo: typeof body.motivo === "string" ? body.motivo : "",
            por: sesion.email,
            rol: sesion.role,
          })
        : { ok: false as const, status: 400, error: "Acción inválida" };
  return r.ok ? Response.json({ pago: r.pago }) : Response.json({ error: r.error }, { status: r.status });
}
