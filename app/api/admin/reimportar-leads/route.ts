// Reimporta leads pegados desde los logs de Vercel (solo superadmin, o el
// equipo técnico con Bearer ESTADO_ACCESOS_TOKEN).
// Body: { texto: string, repartir?: boolean }

import { obtenerSesion } from "@/lib/auth";
import { autorizadoPorToken } from "@/lib/token-operacion";
import { extraerLeadsDeTexto, restaurarLeads } from "@/lib/restaurar-leads";
import { asignarAutomatico } from "@/lib/reparto-auto";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!autorizadoPorToken(req)) {
    const sesion = await obtenerSesion();
    if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
    if (sesion.role !== "superadmin") {
      return Response.json({ error: "Solo el superadmin puede reimportar leads." }, { status: 403 });
    }
  }
  let body: { texto?: unknown; repartir?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  if (typeof body.texto !== "string" || !body.texto.trim()) {
    return Response.json({ error: "Pega el texto de los logs o un arreglo JSON." }, { status: 400 });
  }
  const leads = extraerLeadsDeTexto(body.texto);
  if (leads.length === 0) {
    return Response.json({ error: "No encontré leads en el texto pegado." }, { status: 400 });
  }

  const r = await restaurarLeads(leads);
  const repartidos: string[] = [];
  if (body.repartir === true) {
    for (const l of r.restaurados) {
      const a = await asignarAutomatico(l.id ?? "").catch(() => null);
      if (a?.ok) repartidos.push(`${l.nombre} → ${a.lead.asignadoA}`);
    }
  }
  return Response.json({
    encontrados: leads.length,
    restaurados: r.restaurados.map((l) => l.nombre),
    yaExistian: r.yaExistian,
    descartados: r.descartados,
    repartidos,
  });
}
