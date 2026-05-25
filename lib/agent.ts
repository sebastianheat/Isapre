import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompt";
import { cotizar, obtenerValorUF, type Carga } from "./cotizador";
import { guardarLead } from "./leads";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-7";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "cotizar_planes",
    description:
      "Cotiza 3 opciones reales de plan de salud con precios exactos (catálogos oficiales de las 7 isapres), desglose por beneficiario, cobertura y link al PDF. Por defecto cotiza Nueva Masvida; cambia de isapre solo, según la clínica preferida (ej. Clínica Alemana de Santiago → Esencial), la región (si NMV no la cubre) o la isapre que pida el cliente. Llamar apenas se tenga edad + sueldo líquido (más región, cargas, clínica e isapre si las mencionó).",
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
        isapre_solicitada: {
          type: "string",
          description:
            "Isapre específica que el cliente pidió, si nombró una (ej: 'Banmédica', 'Colmena', 'Consalud', 'Cruz Blanca', 'Vida Tres', 'Esencial', 'Nueva Masvida'). Omitir si no pidió ninguna en particular.",
        },
      },
      required: ["edad", "sueldo_liquido"],
    },
  },
  {
    name: "registrar_lead",
    description:
      "Registra al cliente como lead para que Cynthia lo contacte y cierre. Llamar SOLO cuando el cliente mostró interés y ya entregó su nombre y RUT. Después de llamarla, confirma al cliente con calidez.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Nombre del cliente" },
        rut: { type: "string", description: "RUT del cliente con guión y dígito verificador" },
        isapre: { type: "string", description: "Isapre del plan que le interesó" },
        plan_codigo: { type: "string", description: "Código del plan elegido, si lo hay" },
        region: { type: "string", description: "Región o ciudad del cliente, si la dio" },
      },
      required: ["nombre", "rut"],
    },
  },
];

interface CotizarInput {
  edad?: number;
  sueldo_liquido?: number;
  cargas?: Carga[];
  clinica_preferida?: string;
  region?: string;
  isapre_solicitada?: string;
}

// Procesa un turno: corre el loop de tool-use de Claude y devuelve el texto de respuesta.
export async function responderTurno(
  history: ChatMessage[],
  ctx?: { telefono?: string },
): Promise<string> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let i = 0; i < 5; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      return (
        response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim() || "Perdona, ¿me repites eso?"
      );
    }

    messages.push({ role: "assistant", content: response.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      if (block.name === "cotizar_planes") {
        const input = block.input as CotizarInput;
        const valorUF = await obtenerValorUF();
        const resultado = cotizar(
          Number(input.edad) || 0,
          Number(input.sueldo_liquido) || 0,
          Array.isArray(input.cargas) ? input.cargas : [],
          valorUF,
          input.clinica_preferida ?? null,
          input.region ?? null,
          input.isapre_solicitada ?? null,
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(resultado),
        });
      } else if (block.name === "registrar_lead") {
        const input = block.input as {
          nombre?: string;
          rut?: string;
          isapre?: string;
          plan_codigo?: string;
          region?: string;
        };
        await guardarLead({
          nombre: input.nombre ?? "",
          rut: input.rut ?? "",
          isapre: input.isapre,
          plan: input.plan_codigo,
          region: input.region,
          telefono: ctx?.telefono,
        });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify({ ok: true }),
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  return "Disculpa, se me complicó esto. ¿Me das de nuevo tu edad y sueldo líquido?";
}
