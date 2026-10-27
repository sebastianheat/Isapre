// Descarga del respaldo en Excel en este momento (solo superadmin).

import { obtenerSesion } from "@/lib/auth";
import { generarRespaldo } from "@/lib/respaldo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin puede descargar el respaldo." }, { status: 403 });
  }
  const { archivo, nombre } = await generarRespaldo();
  return new Response(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
