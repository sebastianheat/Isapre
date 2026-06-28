// Helpers para capturar y persistir el gclid de Google Ads.
// El gclid llega como ?gclid=... en la URL cuando el visitante viene de un
// click en un anuncio de Google. Lo guardamos en sessionStorage para que
// sobreviva navegación dentro de la sesión, y lo pasamos al backend al
// generar un lead (form o chat). Eso nos permite saber el canal del lead.

const STORAGE_KEY = "isapre_gclid";

export function capturarGclidDeUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("gclid");
    if (fromUrl) {
      window.sessionStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function obtenerGclid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
