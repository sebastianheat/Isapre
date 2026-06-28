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
      "Cotiza 3 opciones reales de planes de salud con precios exactos (catálogos oficiales de las 7 isapres), desglose por beneficiario, cobertura y link al PDF. Busca el MEJOR plan entre las 7 isapres ajustado al presupuesto del cliente, SIN sesgo por isapre. Reglas de routing: si pide Clínica Alemana de Santiago, cotiza Esencial (única con esa clínica); si pide explícitamente una isapre por nombre, cotiza esa; en cualquier otro caso busca entre todas. Llamar apenas se tenga edad + sueldo líquido (más región, cargas, clínica, isapre y presupuesto si los mencionó).",
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
            "Isapre específica que el cliente pidió, si nombró una (ej: 'Banmédica', 'Colmena', 'Consalud', 'Cruz Blanca', 'Vida Tres', 'Esencial', 'Nueva Masvida'). Omitir si no pidió ninguna en particular — por defecto la herramienta busca el mejor plan entre las 7 isapres.",
        },
        presupuesto_max: {
          type: "integer",
          description:
            "Presupuesto mensual máximo que el cliente dijo que puede pagar, en pesos chilenos (ej: 150000). Omitir si no mencionó un tope; en ese caso la herramienta usa el 7% legal como referencia.",
        },
      },
      required: ["edad", "sueldo_liquido"],
    },
  },
  {
    name: "registrar_lead",
    description:
      "Registra al cliente como lead para que el equipo de ejecutivos lo contacte. Llamar SOLO cuando el cliente confirmó explícitamente que quiere ser contactado o cerrar un plan, y entregó nombre + RUT + al menos uno de los dos contactos (WhatsApp o email). **Pásale TODOS los campos que ya recolectaste en la conversación** (edad, sueldo, cargas, clínica preferida, isapre, plan, etc.) para que el ejecutivo tenga contexto completo. Si falta WhatsApp y email, el tool devuelve error — pídele al cliente al menos uno antes de reintentar.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Nombre del cliente" },
        rut: { type: "string", description: "RUT del cliente con guión y dígito verificador" },
        telefono: { type: "string", description: "WhatsApp del cliente con código país, ej. +56912345678. En WhatsApp ya lo tenemos automático — no es necesario." },
        email: { type: "string", description: "Email del cliente, ej. nombre@dominio.cl" },
        isapre: { type: "string", description: "Isapre del plan que le interesó" },
        plan_codigo: { type: "string", description: "Código del plan elegido, si lo hay" },
        region: { type: "string", description: "Región o ciudad del cliente" },
        edad: { type: "integer", description: "Edad del cliente" },
        sueldo_liquido: { type: "integer", description: "Sueldo líquido mensual en CLP" },
        prevision_actual: { type: "string", description: "Isapre/Fonasa actual del cliente" },
        cargas_resumen: { type: "string", description: 'Cargas en texto, ej. "1 carga (hijo de 5 años)" o "sin cargas"' },
        clinica_preferida: { type: "string", description: "Clínica o prestador de preferencia" },
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
  presupuesto_max?: number;
}

// El modelo a veces formatea URLs como [label](https://...) markdown link.
// Eso se ve bien renderizado pero al COPIAR el mensaje (lo que el cliente
// suele hacer para guardar/reenviar) se pierde la URL — solo queda el label.
// Aplanamos a "label https://..." para que la URL siempre quede visible
// en plain text. Funciona también con emails [x@y.cl](mailto:x@y.cl).
function aplanarUrls(text: string): string {
  return text
    // [label](https://url) -> label https://url
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 $2")
    // [label](mailto:x@y) -> label x@y
    .replace(/\[([^\]]+)\]\(mailto:([^)\s]+)\)/g, "$1 $2");
}

// Resultado de un turno: el texto de respuesta + flag de si en este turno se
// registró exitosamente un lead (para que el frontend dispare la conversión
// de Google Ads). El flag solo es true cuando el tool registrar_lead aceptó
// los datos y los guardó (no cuando devolvió error por falta de contacto).
export interface TurnoResultado {
  reply: string;
  leadCapturado: boolean;
}

// Procesa un turno: corre el loop de tool-use de Claude y devuelve el texto de respuesta.
export async function responderTurno(
  history: ChatMessage[],
  ctx?: { telefono?: string },
): Promise<TurnoResultado> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  let leadCapturado = false;

  for (let i = 0; i < 5; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      const raw =
        response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim() || "Perdona, ¿me repites eso?";
      return { reply: aplanarUrls(raw), leadCapturado };
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
          input.presupuesto_max ? Number(input.presupuesto_max) : null,
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
          telefono?: string;
          email?: string;
          isapre?: string;
          plan_codigo?: string;
          region?: string;
          edad?: number;
          sueldo_liquido?: number;
          prevision_actual?: string;
          cargas_resumen?: string;
          clinica_preferida?: string;
        };
        const telefono = ctx?.telefono ?? input.telefono?.trim() ?? undefined;
        const email = input.email?.trim() ?? undefined;
        if (!telefono && !email) {
          // El equipo necesita un canal para contactar — bloqueamos y
          // pedimos a Romina que se lo pida al cliente.
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify({
              ok: false,
              error:
                "Falta WhatsApp o email para registrar el lead. Pídele al cliente al menos uno de los dos (idealmente ambos) y reintenta.",
            }),
          });
        } else {
          await guardarLead({
            nombre: input.nombre ?? "",
            rut: input.rut ?? "",
            telefono,
            email,
            isapre: input.isapre,
            plan: input.plan_codigo,
            region: input.region,
            edad: input.edad,
            sueldoLiquido: input.sueldo_liquido,
            previsionActual: input.prevision_actual,
            cargasResumen: input.cargas_resumen,
            clinicaPreferida: input.clinica_preferida,
            origen: ctx?.telefono ? "whatsapp-chat" : "web-chat",
          });
          leadCapturado = true;
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify({ ok: true }),
          });
        }
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  return {
    reply: "Disculpa, se me complicó esto. ¿Me das de nuevo tu edad y sueldo líquido?",
    leadCapturado,
  };
}
