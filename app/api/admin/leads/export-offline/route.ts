// Export de conversiones offline para Google Ads (import "Conversions from
// clicks"). Genera un CSV con los leads CALIFICADOS que tienen gclid, en el
// formato exacto que Google Ads espera al subir conversiones:
//
//   Parameters:TimeZone=America/Santiago
//   Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency
//   Cj0KCQ...,Lead Calificado,2026-07-01 14:30:00,11000,CLP
//
// El "Conversion Name" debe coincidir EXACTO con una acción de conversión de
// tipo "Importar > Conversiones de clics" creada en Google Ads (ver
// google-ads/offline-conversions.md). Google dedupea por gclid + nombre +
// hora, así que re-exportar el mismo lead no duplica.
//
// Query params:
//   ?dias=30           ventana de leads a incluir (default 30)
//   ?incluirExportados=1  re-incluye leads ya exportados antes (default no)

import { obtenerSesion } from "@/lib/auth";
import { listarLeads, actualizarLead } from "@/lib/leads";

export const runtime = "nodejs";
export const maxDuration = 30;

const CONVERSION_NAME = process.env.OFFLINE_CONVERSION_NAME || "Lead Calificado";
// Valor de un lead calificado: lo que costaría comprarlo a un tercero.
const CONVERSION_VALUE = Number(process.env.OFFLINE_CONVERSION_VALUE || 11000);

// "yyyy-MM-dd HH:mm:ss" en hora de Santiago (el TimeZone del header hace el resto).
function fmtSantiago(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export async function GET(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (sesion.role !== "superadmin") {
    return Response.json({ error: "Solo el superadmin puede exportar." }, { status: 403 });
  }

  const url = new URL(req.url);
  const dias = Math.max(1, Math.min(90, Number(url.searchParams.get("dias")) || 30));
  const incluirExportados = url.searchParams.get("incluirExportados") === "1";
  const desde = Date.now() - dias * 24 * 60 * 60 * 1000;

  const leads = await listarLeads(500);
  const exportables = leads.filter(
    (l) =>
      l.gclid &&
      l.calidad === "calificado" &&
      l.fecha &&
      Date.parse(l.fecha) >= desde &&
      (incluirExportados || !l.exportadoOffline),
  );

  const lineas = [
    "Parameters:TimeZone=America/Santiago",
    "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency",
    ...exportables.map((l) =>
      [l.gclid, CONVERSION_NAME, fmtSantiago(l.fecha!), CONVERSION_VALUE, "CLP"].join(","),
    ),
  ];

  // Marcamos los exportados para que el próximo export no los repita
  // (Google dedupea igual, pero así el CSV queda limpio).
  const ahora = new Date().toISOString();
  for (const l of exportables) {
    if (l.id) await actualizarLead(l.id, { exportadoOffline: ahora }).catch(() => {});
  }

  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(lineas.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="offline-conversions-${fecha}.csv"`,
      "X-Total-Exportados": String(exportables.length),
    },
  });
}
