// Captura de leads que sobrevive a una caída de la base (Upstash).
//
// Si guardarLead falla, el lead NO queda en el panel: se deja completo en el
// log con la marca "LEAD SIN GUARDAR" (se recupera desde /admin/reimportar) y
// se manda igual el correo a info@, para que nadie pierda el contacto.

import { enviarLeadPorEmail } from "./email";
import { guardarLead, type GuardarLeadOpciones, type GuardarLeadResultado, type Lead } from "./leads";

export async function guardarLeadSeguro(
  lead: Lead,
  opciones?: GuardarLeadOpciones,
): Promise<GuardarLeadResultado> {
  try {
    return await guardarLead(lead, opciones);
  } catch (err) {
    const registro: Lead = { ...lead, fecha: new Date().toISOString() };
    console.error("Error guardando lead:", err);
    console.error("LEAD SIN GUARDAR:", JSON.stringify(registro));
    try {
      await enviarLeadPorEmail(registro);
    } catch (e) {
      console.error("Email del lead falló:", e);
    }
    return { lead: registro, esNuevo: true };
  }
}
