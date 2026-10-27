import { afterEach, describe, expect, it, vi } from "vitest";

// Simula lo del 24-10-2026: Upstash configurado pero rechazando todo por cuota.
vi.hoisted(() => {
  process.env.KV_REST_API_URL = "https://upstash.invalido";
  process.env.KV_REST_API_TOKEN = "token-de-prueba";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.RESEND_API_KEY;
  delete process.env.HEAT_API_KEY;
});

const CUOTA = "ERR max requests limit exceeded. Limit: 500000, Usage: 500000";

afterEach(() => vi.unstubAllGlobals());

function upstashSinCuota() {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: CUOTA }), { status: 400 })));
}

describe("caída de la base", () => {
  it("leer falla con el motivo real en vez de devolver una base vacía", async () => {
    upstashSinCuota();
    const { listarLeads } = await import("./leads");
    const { getUsuario } = await import("./usuarios");
    await expect(listarLeads(50)).rejects.toThrow(/Base de datos no disponible \(Upstash 400\).*max requests/);
    await expect(getUsuario("info@nuevaisapre.cl")).rejects.toThrow(/Base de datos no disponible/);
  });

  it("el lead no se pierde: queda en el log marcado como LEAD SIN GUARDAR", async () => {
    upstashSinCuota();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { guardarLeadSeguro } = await import("./guardar-lead-seguro");
    const r = await guardarLeadSeguro({ nombre: "Ana", rut: "1-9", email: "ana@x.cl", telefono: "+56911111111" });
    expect(r.esNuevo).toBe(true);
    const linea = log.mock.calls.find((c) => c[0] === "LEAD SIN GUARDAR:");
    expect(JSON.parse(linea?.[1] as string)).toMatchObject({ nombre: "Ana", email: "ana@x.cl" });
    log.mockRestore();
  });
});
