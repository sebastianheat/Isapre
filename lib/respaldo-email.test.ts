import { describe, expect, it, vi } from "vitest";

const enviados = vi.hoisted(() => [] as { to: string[]; attachments?: unknown[] }[]);
vi.hoisted(() => {
  process.env.RESEND_API_KEY = "re_prueba";
  process.env.RESPALDO_EMAIL_COPIA = "copia@x.cl, otra@x.cl";
  delete process.env.LEAD_EMAIL_TO;
});
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (m: { to: string[]; attachments?: unknown[] }) => {
        enviados.push(m);
        return m.to[0] === "otra@x.cl"
          ? { data: null, error: { message: "buzón no existe" } }
          : { data: { id: `id-${m.to[0]}` }, error: null };
      },
    };
  },
}));

describe("enviarRespaldoPorEmail", () => {
  it("manda un correo con el Excel a info@ y a cada copia; uno que falla no frena a los demás", async () => {
    const { enviarRespaldoPorEmail } = await import("./email");
    const envios = await enviarRespaldoPorEmail(Buffer.from("xlsx"), "r.xlsx", { leads: 1, sinAsignar: 0, ejecutivos: 1 });
    expect(enviados.map((m) => m.to)).toEqual([["info@nuevaisapre.cl"], ["copia@x.cl"], ["otra@x.cl"]]);
    expect(enviados.every((m) => m.attachments?.length === 1)).toBe(true);
    expect(envios).toEqual([
      { para: "info@nuevaisapre.cl", id: "id-info@nuevaisapre.cl" },
      { para: "copia@x.cl", id: "id-copia@x.cl" },
      { para: "otra@x.cl", error: "buzón no existe" },
    ]);
  });
});
