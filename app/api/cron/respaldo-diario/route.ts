// Cron diario (05:00 UTC = 2 AM en Chile con horario de verano, 1 AM en
// invierno): genera el Excel de respaldo del panel y lo manda a info@.

import { enviarRespaldoPorEmail } from "@/lib/email";
import { generarRespaldo } from "@/lib/respaldo";
import { estadoAsignacion } from "@/lib/pipeline";

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
  try {
    const { archivo, nombre, datos } = await generarRespaldo();
    const resumen = {
      leads: datos.leads.length,
      sinAsignar: datos.leads.filter((l) => estadoAsignacion(l) !== "asignado").length,
      ejecutivos: datos.usuarios.filter((u) => u.role === "ejecutivo").length,
    };
    const envios = await enviarRespaldoPorEmail(archivo, nombre, resumen);
    console.log(`Respaldo diario enviado: ${nombre} (${archivo.length} bytes)`, resumen, envios);
    for (const e of envios.filter((x) => x.error)) console.error(`Respaldo a ${e.para} falló: ${e.error}`);
    return Response.json({ ok: true, archivo: nombre, bytes: archivo.length, ...resumen, envios });
  } catch (e) {
    console.error("Respaldo diario falló:", e);
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
