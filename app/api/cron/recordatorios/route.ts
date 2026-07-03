// Cron endpoint: cada 15 min Vercel llama a este endpoint. Revisa TODOS los
// leads con recordatorios pendientes cuya fecha ya pasó, manda email al
// ejecutivo asignado (o a info@ como fallback) y los marca como notificados.
//
// Protección: header "authorization: Bearer <CRON_SECRET>" — Vercel Cron
// automáticamente firma con la env var CRON_SECRET si está configurada.

import { listarLeads, marcarRecordatorioNotificado } from "@/lib/leads";
import { enviarRecordatorioPorEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const now = Date.now();
  const leads = await listarLeads(500);
  const disparados: { leadId: string; recId: string; error?: string }[] = [];
  let ok = 0;
  let fail = 0;

  for (const lead of leads) {
    for (const rec of lead.recordatorios ?? []) {
      if (rec.notificado) continue;
      if (Date.parse(rec.fecha) > now) continue;
      // Vencido y no notificado — mandamos email.
      try {
        await enviarRecordatorioPorEmail(lead, rec);
        await marcarRecordatorioNotificado(lead.id ?? "", rec.id);
        disparados.push({ leadId: lead.id ?? "", recId: rec.id });
        ok++;
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        disparados.push({ leadId: lead.id ?? "", recId: rec.id, error });
        fail++;
      }
    }
  }

  return Response.json({
    ok: true,
    procesados: ok + fail,
    exitosos: ok,
    fallidos: fail,
    detalles: disparados,
  });
}
