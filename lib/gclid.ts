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
