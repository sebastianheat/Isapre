// Cron semanal (lunes 12:00 UTC ≈ 08-09:00 Chile): genera el CSV de
// conversiones offline con los leads calificados de la semana y lo manda por
// email a info@ como adjunto. Titi solo descarga y sube en Google Ads.
// Si no hay leads nuevos que exportar, no manda nada.

import { generarCsvOffline } from "@/lib/offline";
import { enviarCsvOfflinePorEmail } from "@/lib/email";

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

  const { csv, exportados } = await generarCsvOffline({
    dias: 14, // ventana generosa por si un lunes falla y se recupera al siguiente
    incluirExportados: false,
    marcar: false, // marcamos DESPUÉS de que el email salga bien
  });

  if (exportados.length === 0) {
    return Response.json({ ok: true, exportados: 0, detalle: "Sin leads nuevos que exportar." });
  }

  try {
    await enviarCsvOfflinePorEmail(csv, exportados.length);
  } catch (e) {
    console.error("Email CSV semanal falló:", e);
    return Response.json(
      { ok: false, exportados: 0, error: "Email falló; no se marcaron leads." },
      { status: 500 },
    );
  }

  // Email salió OK → ahora sí marcamos para no re-enviarlos el próximo lunes.
  await generarCsvOffline({ dias: 14, incluirExportados: false, marcar: true });

  return Response.json({ ok: true, exportados: exportados.length });
}
