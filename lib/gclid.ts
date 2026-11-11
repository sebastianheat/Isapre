// Helpers para capturar y persistir los click IDs de anuncios.
// - gclid: Google Ads (?gclid=...)
// - fbclid: Meta / Facebook / Instagram (?fbclid=...)
// Se guardan en sessionStorage para sobrevivir la navegación de la sesión y
// se envían al backend al generar un lead (form o chat) para etiquetar el
// canal correctamente.

const GCLID_KEY = "isapre_gclid";
const FBCLID_KEY = "isapre_fbclid";

// Captura ambos click IDs de la URL si están presentes. Llamar al montar
// cualquier componente de entrada (form, chat).
export function capturarGclidDeUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const g = url.searchParams.get("gclid");
    if (g) window.sessionStorage.setItem(GCLID_KEY, g);
    const f = url.searchParams.get("fbclid");
    if (f) window.sessionStorage.setItem(FBCLID_KEY, f);
    capturarCampana(url);
    return g ?? window.sessionStorage.getItem(GCLID_KEY);
  } catch {
    return null;
  }
}

export function obtenerGclid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(GCLID_KEY);
  } catch {
    return null;
  }
}

export function obtenerFbclid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(FBCLID_KEY);
  } catch {
    return null;
  }
}

// Datos de la campaña que trajo la visita. Google Ads agrega solo, con el
// etiquetado automático, gad_campaignid (ID de la campaña) y, en iPhone,
// gbraid/wbraid en vez de gclid. Los utm_* se agregan a mano en el anuncio.
// Se guardan los de la última URL que los traía.
const CAMPANA_KEY = "isapre_campana";
const PARAMS_CAMPANA = [
  "gad_campaignid", "gad_source", "gbraid", "wbraid",
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
] as const;
export type DatosCampana = Partial<Record<(typeof PARAMS_CAMPANA)[number], string>>;

function capturarCampana(url: URL): void {
  const datos: DatosCampana = {};
  for (const p of PARAMS_CAMPANA) {
    const v = url.searchParams.get(p);
    if (v) datos[p] = v.slice(0, 200);
  }
  if (Object.keys(datos).length > 0) window.sessionStorage.setItem(CAMPANA_KEY, JSON.stringify(datos));
}

export function obtenerCampana(): DatosCampana {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(CAMPANA_KEY) || "{}") as DatosCampana;
  } catch {
    return {};
  }
}
