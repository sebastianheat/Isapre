// Cron diario (12:00 UTC = 9 AM en Chile con horario de verano, 8 AM en
// invierno): resumen push a cada vendedor con notificaciones activas.

import { listarLeads } from "@/lib/leads";
import { enviarResumenDiario } from "@/lib/avisos-push";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
  }
  const enviados = await enviarResumenDiario(await listarLeads(5000));
  console.log(`Resumen diario push: ${enviados} notificaciones`);
  return Response.json({ ok: true, enviados });
}
