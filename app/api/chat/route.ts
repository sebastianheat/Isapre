import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { cotizar, obtenerValorUF, type Carga } from "@/lib/cotizador";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-7";

const TOOLS: Anthropic.Tool[] = [
  {
    name: "cotizar_planes",
    description:
      "Calcula 3 opciones reales de planes de Nueva Masvida con precios exactos (catálogo oficial), el desglose por beneficiario, la cobertura y el link al PDF de cada plan. Llamar apenas se tenga la edad del cotizante y el sueldo líquido mensual (y las cargas y la clínica preferida, si las hay).",
    input_schema: {
      type: "object",
      properties: {
        edad: { type: "integer", description: "Edad del cotizante en años" },
        sueldo_liquido: {
          type: "integer",
          description:
            "Sueldo líquido mensual del cotizante en pesos chilenos, lo que recibe en mano (ej: 1000000). El 7% legal se estima internamente.",
        },
        cargas: {
          type: "array",
          description: "Cargas familiares; cada una con su edad. Vacío si no tiene.",
          items: {
            type: "object",
            properties: { edad: { type: "integer" } },
            required: ["edad"],
          },
        },
        clinica_preferida: {
          type: "string",
          description:
            "Clínica o prestador de preferencia del cliente, si lo mencionó (ej: 'Clínica Dávila', 'Indisa'). Omitir si no indicó ninguna.",
        },
        region: {
          type: "string",
          description:
            "Región o ciudad donde vive el cliente (ej: 'Santiago', 'Viña del Mar', 'Concepción'). Sirve para mostrar los planes con clínicas de su zona. Omitir si no la indicó.",
        },
      },
      required: ["edad", "sueldo_liquido"],
    },
  },
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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
    .map((m) => ({ role: m.role, content: m.content }));

  if (history.length === 0) {
    return Response.json({ error: "No hay mensajes." }, { status: 400 });
  }

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = history;

  try {
    // Loop de tool use: máximo unas pocas iteraciones por turno.
    for (let i = 0; i < 4; i++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== "tool_use" || block.name !== "cotizar_planes") continue;
          const input = block.input as {
            edad?: number;
            sueldo_liquido?: number;
            cargas?: Carga[];
            clinica_preferida?: string;
            region?: string;
          };
          const valorUF = await obtenerValorUF();
          const resultado = cotizar(
            Number(input.edad) || 0,
            Number(input.sueldo_liquido) || 0,
            Array.isArray(input.cargas) ? input.cargas : [],
            valorUF,
            input.clinica_preferida ?? null,
            input.region ?? null,
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(resultado),
          });
        }

        messages.push({ role: "user", content: toolResults });
        continue;
      }

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      return Response.json({ reply: text || "Perdona, ¿me repites eso?" });
    }

    return Response.json({
      reply: "Disculpa, se me complicó el cálculo. ¿Me das de nuevo tu edad y renta?",
    });
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
