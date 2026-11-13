// Notificaciones push del usuario conectado.
// GET: clave pública VAPID (para suscribirse) y si ya tiene dispositivos.
// POST: guarda la suscripción de este dispositivo. Body: { subscription }
//       Con { prueba: true } manda una notificación de prueba a sus dispositivos.
// DELETE: quita este dispositivo. Body: { endpoint }

import { obtenerSesion } from "@/lib/auth";
import { clavePublica, enviarPush, esSuscripcionValida, guardarSuscripcion, quitarSuscripcion, tieneDispositivos } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  return Response.json({ clavePublica: clavePublica(), activo: await tieneDispositivos(sesion.email) });
}

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  let body: { subscription?: unknown; prueba?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (body.prueba === true) {
    const enviados = await enviarPush(sesion.email, {
      titulo: "🔔 Notificaciones activas",
      cuerpo: "Así te van a llegar los avisos del panel de Nueva Isapre.",
      url: "/admin/perfil",
      tag: "prueba",
    });
    return Response.json({ enviados });
  }
  if (!esSuscripcionValida(body.subscription)) {
    return Response.json({ error: "Suscripción inválida" }, { status: 400 });
  }
  const dispositivos = await guardarSuscripcion(sesion.email, body.subscription);
  return Response.json({ ok: true, dispositivos });
}

export async function DELETE(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { endpoint?: unknown };
  if (typeof body.endpoint !== "string") return Response.json({ error: "Falta endpoint" }, { status: 400 });
  await quitarSuscripcion(sesion.email, body.endpoint);
  return Response.json({ ok: true });
}
