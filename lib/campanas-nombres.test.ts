import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});

describe("nombres de campañas", () => {
  it("guarda, cambia y borra el nombre de un ID", async () => {
    const m = await import("./campanas-nombres");
    expect(await m.guardarNombreCampana("111", "  PMax - Leads Chile ")).toEqual({ "111": "PMax - Leads Chile" });
    expect(await m.guardarNombreCampana("222", "Search - Chile")).toMatchObject({ "222": "Search - Chile" });
    expect(await m.guardarNombreCampana("111", "")).toEqual({ "222": "Search - Chile" });
    await expect(m.guardarNombreCampana("abc", "x")).rejects.toThrow();
  });

  it("lista las campañas que trajeron leads, la más reciente primero", async () => {
    const { campanasVistas } = await import("./campanas-nombres");
    const l = (id: string | undefined, fecha: string) => ({ nombre: "x", rut: "", campanaId: id, fecha });
    expect(campanasVistas([l("1", "2026-11-01"), l("2", "2026-11-03"), l("1", "2026-11-02"), l(undefined, "2026-11-04")])).toEqual([
      { id: "2", leads: 1, ultimo: "2026-11-03" },
      { id: "1", leads: 2, ultimo: "2026-11-02" },
    ]);
  });
});
