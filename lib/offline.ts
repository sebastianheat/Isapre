// Generación del CSV de conversiones offline para Google Ads. Compartido por
// el endpoint manual (/api/admin/leads/export-offline) y el cron semanal que
// lo manda por email (/api/cron/export-semanal).

import { listarLeads, actualizarLead, type Lead } from "./leads";

export const CONVERSION_NAME = process.env.OFFLINE_CONVERSION_NAME || "Lead Calificado";
// Valor de un lead calificado: lo que costaría comprarlo a un tercero.
export const CONVERSION_VALUE = Number(process.env.OFFLINE_CONVERSION_VALUE || 11000);

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

export interface CsvOffline {
  csv: string;
  exportados: Lead[];
}

// Arma el CSV con los leads calificados+gclid de la ventana. Si marcar=true,
// setea exportadoOffline en cada lead incluido (para no repetirlos después).
export async function generarCsvOffline(opts: {
  dias?: number;
  incluirExportados?: boolean;
  marcar?: boolean;
}): Promise<CsvOffline> {
  const dias = Math.max(1, Math.min(90, opts.dias ?? 30));
  const desde = Date.now() - dias * 24 * 60 * 60 * 1000;

  const leads = await listarLeads(500);
  const exportables = leads.filter(
    (l) =>
      l.gclid &&
      l.calidad === "calificado" &&
      l.fecha &&
      Date.parse(l.fecha) >= desde &&
      (opts.incluirExportados || !l.exportadoOffline),
  );

  const lineas = [
    "Parameters:TimeZone=America/Santiago",
    "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency",
    ...exportables.map((l) =>
      [l.gclid, CONVERSION_NAME, fmtSantiago(l.fecha!), CONVERSION_VALUE, "CLP"].join(","),
    ),
  ];

  if (opts.marcar) {
    const ahora = new Date().toISOString();
    for (const l of exportables) {
      if (l.id) await actualizarLead(l.id, { exportadoOffline: ahora }).catch(() => {});
    }
  }

  return { csv: lineas.join("\r\n") + "\r\n", exportados: exportables };
}
