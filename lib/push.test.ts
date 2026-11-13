import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.RESEND_API_KEY;
  delete process.env.HEAT_API_KEY;
  process.env.VAPID_PUBLIC_KEY = "pub";
  process.env.VAPID_PRIVATE_KEY = "priv";
});

const enviados = vi.hoisted(() => [] as { endpoint: string; aviso: { titulo: string; cuerpo: string; url?: string } }[]);
const muertos = vi.hoisted(() => new Set<string>());
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: () => {},
    sendNotification: async (s: { endpoint: string }, payload: string) => {
      if (muertos.has(s.endpoint)) throw Object.assign(new Error("gone"), { statusCode: 410 });
      enviados.push({ endpoint: s.endpoint, aviso: JSON.parse(payload) });
    },
  },
}));

const sub = (n: string) => ({ endpoint: `https://push.example/${n}`, keys: { p256dh: "k", auth: "a" } });

async function cargar() {
  vi.resetModules();
  const [push, avisos, leads, usuarios, credits, reparto] = await Promise.all([
    import("./push"),
    import("./avisos-push"),
    import("./leads"),
    import("./usuarios"),
    import("./credits-kv"),
    import("./reparto"),
  ]);
  return { push, avisos, leads, usuarios, credits, reparto };
}

describe("notificaciones push", () => {
  beforeEach(() => {
    enviados.length = 0;
    muertos.clear();
  });

  it("guarda varios dispositivos por persona, sin duplicar el mismo", async () => {
    const c = await cargar();
    await c.push.guardarSuscripcion("ana@x.cl", sub("cel"));
    await c.push.guardarSuscripcion("Ana@x.cl", sub("cel"));
    expect(await c.push.guardarSuscripcion("ana@x.cl", sub("pc"))).toBe(2);
    expect(await c.push.enviarPush("ana@x.cl", { titulo: "Hola", cuerpo: "x" })).toBe(2);
    expect(c.push.esSuscripcionValida(sub("a"))).toBe(true);
    expect(c.push.esSuscripcionValida({ endpoint: "http://inseguro" })).toBe(false);
  });

  it("borra el dispositivo que ya no existe (410) y sigue con los demás", async () => {
    const c = await cargar();
    await c.push.guardarSuscripcion("ana@x.cl", sub("viejo"));
    await c.push.guardarSuscripcion("ana@x.cl", sub("nuevo"));
    muertos.add(sub("viejo").endpoint);
    expect(await c.push.enviarPush("ana@x.cl", { titulo: "t", cuerpo: "c" })).toBe(1);
    muertos.clear();
    enviados.length = 0;
    await c.push.enviarPush("ana@x.cl", { titulo: "t", cuerpo: "c" });
    expect(enviados.map((e) => e.endpoint)).toEqual([sub("nuevo").endpoint]);
  });

  it("al asignarle un lead, el vendedor recibe el push con el nombre y su cuenta del mes", async () => {
    const c = await cargar();
    await c.usuarios.crearUsuario({ email: "ana@x.cl", password: "clave123", role: "ejecutivo", nombre: "Ana" });
    await c.credits.regalarCreditos({ email: "ana@x.cl", cantidad: 5, motivo: "cupo", por: "s@x.cl" });
    await c.push.guardarSuscripcion("ana@x.cl", sub("cel"));
    const { lead } = await c.leads.guardarLead({ nombre: "María Pérez", rut: "1-9", telefono: "56911111111", region: "Metropolitana" });
    await c.reparto.asignarLead(lead.id!, "ana@x.cl", "s@x.cl");
    expect(enviados).toHaveLength(1);
    expect(enviados[0].aviso).toMatchObject({ titulo: "📋 Nuevo lead: María Pérez", cuerpo: "Metropolitana · llevas 1 este mes" });
    expect(enviados[0].aviso.url).toContain("/admin/leads/");
  });

  it("sin claves VAPID no manda nada y no falla", async () => {
    const pub = process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PUBLIC_KEY;
    const c = await cargar();
    await c.push.guardarSuscripcion("ana@x.cl", sub("cel"));
    expect(await c.push.enviarPush("ana@x.cl", { titulo: "t", cuerpo: "c" })).toBe(0);
    process.env.VAPID_PUBLIC_KEY = pub;
  });

  it("texto del resumen de la mañana", async () => {
    const c = await cargar();
    expect(c.avisos.textoResumen(3, 2, 14)).toBe("Ayer recibiste 3 leads · 2 sin contactar · cupo: 14");
    expect(c.avisos.textoResumen(0, 0, 20)).toBe("Ayer no recibiste leads · cupo: 20");
    expect(c.avisos.textoResumen(1, 0, 5)).toBe("Ayer recibiste 1 lead · cupo: 5");
  });
});
