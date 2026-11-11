// Campaña de Google Ads de cada lead. Módulo client-safe (sin servidor).
//
// Google no manda el NOMBRE de la campaña en la URL, solo su ID
// (gad_campaignid, que agrega el etiquetado automático). Aquí se traduce el ID
// al nombre que se ve en el panel. Para agregar una campaña nueva: copiar su
// ID desde Google Ads (columna "ID de campaña") y sumar una línea.
export const CAMPANAS_GOOGLE_ADS: Record<string, string> = {};

export interface DatosCampanaLead {
  campanaId?: string;
  utmCampaign?: string;
}

// Nombre para mostrar: el de la tabla; si el ID no está en la tabla, el
// utm_campaign del anuncio; si tampoco, "Campaña <ID>".
export function nombreCampana(l: DatosCampanaLead): string | undefined {
  if (l.campanaId && CAMPANAS_GOOGLE_ADS[l.campanaId]) return CAMPANAS_GOOGLE_ADS[l.campanaId];
  if (l.utmCampaign) return l.utmCampaign;
  if (l.campanaId) return `Campaña ${l.campanaId}`;
  return undefined;
}

// Versión corta para las etiquetas del panel (sin el prefijo común "Isapre Nueva - ").
export function nombreCampanaCorto(l: DatosCampanaLead): string | undefined {
  return nombreCampana(l)?.replace(/^Isapre Nueva\s*-\s*/i, "");
}

// Convierte lo que manda el navegador (parámetros de la URL de llegada) en los
// campos del lead. Valida tipos y largos: llega de un request público.
export interface CamposCampana {
  gbraid?: string;
  wbraid?: string;
  campanaId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export function camposDeCampana(raw: unknown): CamposCampana {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const txt = (k: string) => (typeof r[k] === "string" && r[k] ? (r[k] as string).trim().slice(0, 200) : undefined);
  const id = txt("gad_campaignid");
  const c: CamposCampana = {
    gbraid: txt("gbraid"),
    wbraid: txt("wbraid"),
    campanaId: id && /^\d{1,20}$/.test(id) ? id : undefined,
    utmSource: txt("utm_source"),
    utmMedium: txt("utm_medium"),
    utmCampaign: txt("utm_campaign"),
    utmTerm: txt("utm_term"),
    utmContent: txt("utm_content"),
  };
  return Object.fromEntries(Object.entries(c).filter(([, v]) => v)) as CamposCampana;
}

// ¿La visita vino de Google Ads? gclid, o su reemplazo en iPhone, o el ID de campaña.
export function vieneDeGoogleAds(gclid: string | undefined, c: CamposCampana): boolean {
  return !!(gclid || c.gbraid || c.wbraid || c.campanaId);
}
