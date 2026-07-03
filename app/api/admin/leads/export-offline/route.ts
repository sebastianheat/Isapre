// Export manual de conversiones offline (botón del panel, solo superadmin).
// La lógica del CSV vive en lib/offline.ts (compartida con el cron semanal).
//
// Query params:
//   ?dias=30              ventana de leads a incluir (default 30)
//   ?incluirExportados=1  re-incluye leads ya exportados antes (default no)

import { obtenerSesion } from "@/lib/auth";
import { generarCsvOffline } from "@/lib/offline";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin puede exportar." }, { status: 403 });
  }

  const url = new URL(req.url);
  const { csv, exportados } = await generarCsvOffline({
    dias: Number(url.searchParams.get("dias")) || 30,
    incluirExportados: url.searchParams.get("incluirExportados") === "1",
    marcar: true,
  });

  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="offline-conversions-${fecha}.csv"`,
      "X-Total-Exportados": String(exportados.length),
    },
  });
}
