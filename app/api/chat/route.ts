import Anthropic from "@anthropic-ai/sdk";
import { responderTurno, type ChatMessage } from "@/lib/agent";

export const runtime = "nodejs";
// Las respuestas con 3 opciones + detalle por clínica con Opus llegan a
// 15-25s. Damos margen hasta 60s para evitar 504 cuando el modelo elige
// una respuesta más detallada (que el frontend leía como "Sin conexión").
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Falta configurar ANTHROPIC_API_KEY en el servidor." },
      { status: 500 },
    );
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const history = (body.messages ?? [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content?.trim())
    .map((m) => ({ role: m.role, content: m.content }) as ChatMessage);

  if (history.length === 0) {
    return Response.json({ error: "No hay mensajes." }, { status: 400 });
  }

  try {
    const { reply, leadCapturado } = await responderTurno(history);
    return Response.json({ reply, leadCapturado });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "Hay mucha demanda en este momento. Intenta de nuevo en unos segundos." },
        { status: 429 },
      );
    }
    console.error("Error en /api/chat:", err);
    return Response.json({ error: "Algo falló. Intenta de nuevo." }, { status: 500 });
  }
}
