import { responderTurno } from "@/lib/agent";
import { enviarWhatsApp, getHistorial, guardarHistorial } from "@/lib/whatsapp";
import { kvMarcarUnaVez } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

// Verificación del webhook (Meta hace un GET al configurarlo).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Mensajes entrantes de WhatsApp.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: true });
  }

  try {
    const value = (body as any)?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    if (!msg?.from) return Response.json({ ok: true }); // statuses, etc.

    // Dedupe: Meta reintenta el webhook; procesamos cada mensaje una sola vez.
    if (!(await kvMarcarUnaVez(`wamsg:${msg.id}`))) return Response.json({ ok: true });

    const from: string = msg.from;
    let texto = "";
    if (msg.type === "text") {
      texto = msg.text?.body ?? "";
    } else if (msg.type === "audio" || msg.type === "voice") {
      texto =
        "(El cliente envió una nota de voz. Por ahora pídele con amabilidad que te lo escriba.)";
    } else {
      texto = "(El cliente envió un adjunto que no puedo leer. Pídele que te escriba su consulta.)";
    }
    if (!texto.trim()) return Response.json({ ok: true });

    const historial = await getHistorial(from);
    historial.push({ role: "user", content: texto });
    const reply = await responderTurno(historial, { telefono: from });
    historial.push({ role: "assistant", content: reply });
    await guardarHistorial(from, historial);
    await enviarWhatsApp(from, reply);
  } catch (e) {
    console.error("Error en webhook de WhatsApp:", e);
  }

  return Response.json({ ok: true });
}
