import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});

async function cargar() {
  vi.resetModules();
  return await import("./usuarios");
}

describe("recibiendoLeads", () => {
  let u: Awaited<ReturnType<typeof cargar>>;
  beforeEach(async () => {
    u = await cargar();
  });

  it("un usuario nuevo recibe leads por defecto (también los previos a la Fase 1)", async () => {
    const creado = await u.crearUsuario({ email: "a@x.cl", password: "123456", role: "ejecutivo" });
    expect(creado.recibiendoLeads).toBe(true);
    expect(u.recibeLeads({})).toBe(true);
  });

  it("setRecibiendoLeads apaga y vuelve a prender, y se refleja en listarUsuarios", async () => {
    await u.crearUsuario({ email: "a@x.cl", password: "123456", role: "ejecutivo" });
    expect((await u.setRecibiendoLeads("a@x.cl", false))?.recibiendoLeads).toBe(false);
    expect((await u.listarUsuarios())[0].recibiendoLeads).toBe(false);
    expect((await u.getUsuario("a@x.cl"))?.recibiendoLeads).toBe(false);
    await u.setRecibiendoLeads("a@x.cl", true);
    expect((await u.listarUsuarios())[0].recibiendoLeads).toBe(true);
  });

  it("apagar el interruptor no toca el resto del usuario", async () => {
    await u.crearUsuario({ email: "a@x.cl", password: "123456", role: "ejecutivo", nombre: "Ana" });
    const antes = await u.getUsuario("a@x.cl");
    await u.setRecibiendoLeads("a@x.cl", false);
    const despues = await u.getUsuario("a@x.cl");
    expect(despues).toMatchObject({ ...antes, recibiendoLeads: false });
  });

  it("devuelve null si el usuario no existe", async () => {
    expect(await u.setRecibiendoLeads("nadie@x.cl", false)).toBeNull();
  });
});
