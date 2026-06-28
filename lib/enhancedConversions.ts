// Enhanced Conversions de Google Ads: cuando disparamos la conversión, además
// del send_to mandamos user_data con email/teléfono HASHEADOS SHA-256. Google
// matchea ese hash con su base de cuentas logueadas para mejorar la
// atribución del click → conversión (15-25% más conversiones medidas
// correctamente). El hash se hace en cliente, los datos en claro NUNCA
// salen del browser del usuario.

async function sha256Hex(input: string): Promise<string> {
  const norm = input.trim().toLowerCase();
  const buf = new TextEncoder().encode(norm);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Normaliza el teléfono a formato E.164 (+56...) — Google requiere E.164 para
// que el matching funcione. Si ya viene con +56 lo respeta, si no, lo
// agrega asumiendo Chile.
function normalizarTelefonoE164(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("56")) return `+${digits}`;
  if (digits.startsWith("9") && digits.length === 9) return `+56${digits}`;
  if (digits.length === 8) return `+569${digits}`;
  return `+${digits}`;
}

export interface UserDataConversion {
  email?: string;
  telefono?: string;
  nombre?: string;
  region?: string;
}

// Construye el objeto user_data de Google Ads Enhanced Conversions con todos
// los identificadores disponibles ya hasheados.
export async function construirUserData(input: UserDataConversion): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (input.email) {
    out.sha256_email_address = await sha256Hex(input.email);
  }
  if (input.telefono) {
    out.sha256_phone_number = await sha256Hex(normalizarTelefonoE164(input.telefono));
  }
  if (input.nombre) {
    // Google espera first_name y last_name hasheados por separado.
    const parts = input.nombre.trim().split(/\s+/);
    const first = parts[0] || "";
    const last = parts.slice(1).join(" ");
    if (first) out["sha256_first_name"] = await sha256Hex(first);
    if (last) out["sha256_last_name"] = await sha256Hex(last);
  }
  return out;
}

type Gtag = (cmd: string, event: string, params: Record<string, unknown>) => void;

// Dispara la conversión de Google Ads con Enhanced Conversions habilitado.
// Si el navegador no tiene gtag cargado (env sin AW-ID) hace no-op.
export async function dispararConversionEnhanced(
  sendTo: string,
  userData: UserDataConversion,
  value = 1,
  currency = "CLP",
): Promise<void> {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return;
  const hashed = await construirUserData(userData);
  gtag("event", "conversion", {
    send_to: sendTo,
    value,
    currency,
    user_data: hashed,
  });
}
