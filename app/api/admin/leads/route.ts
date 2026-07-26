import { obtenerSesion } from "@/lib/auth";
import { listarLeads } from "@/lib/leads";
import { filtrarLeadsVisibles } from "@/lib/acceso";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  const leads = filtrarLeadsVisibles(sesion, await listarLeads(300));
  return Response.json({ leads });
}
