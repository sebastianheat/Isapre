import { describe, expect, it, vi } from "vitest";

// KV en memoria: este test nunca debe tocar el Upstash real.
vi.hoisted(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.RESEND_API_KEY;
  delete process.env.HEAT_API_KEY;
});

async function cargar() {
  vi.resetModules();
  const [leads, restaurar] = await Promise.all([import("./leads"), import("./restaurar-leads")]);
  return { leads, restaurar };
}

const AHORA = Date.parse("2026-10-27T20:00:00Z");
const LOG = `
### 2026-10-26T12:41:20.416Z POST /api/lead [info/function]
dep=dpl_x region=gru1
    LEAD nuevo: {"nombre":"Pedro {Prueba}","rut":"111111111","telefono":"+56900000001","email":"pedro@x.cl","region":"Metropolitana","canal":"google-ads","id":"lead:+56900000001:1793018480000","fecha":"2026-10-26T12:41:20.392Z","actualizado":"2026-10-26T12:41:20.392Z","contactos":1,"assignmentStatus":"sin_asignar"}

### 2026-10-27T13:09:42.270Z POST /api/lead [error/function]
    LEAD SIN GUARDAR: {"nombre":"Laura Ejemplo","rut":"22222222k","telefono":"56900000002","email":"laura@x.cl","fecha":"2026-10-27T13:09:42.236Z"}
`;

describe("extraerLeadsDeTexto", () => {
  it("saca los leads de las líneas de log, aunque traigan llaves dentro de strings", async () => {
    const { restaurar } = await cargar();
    const leads = restaurar.extraerLeadsDeTexto(LOG);
    expect(leads.map((l) => l.nombre)).toEqual(["Pedro {Prueba}", "Laura Ejemplo"]);
  });

  it("acepta un arreglo JSON", async () => {
    const { restaurar } = await cargar();
    const leads = restaurar.extraerLeadsDeTexto('[{"nombre":"Ana","email":"ana@x.cl"}]');
    expect(leads).toHaveLength(1);
  });
});

describe("restaurarLeads", () => {
  it("devuelve los leads al panel con su fecha original, sin asignar", async () => {
    const { leads, restaurar } = await cargar();
    const r = await restaurar.restaurarLeads(restaurar.extraerLeadsDeTexto(LOG), AHORA);
    expect(r.restaurados).toHaveLength(2);
    const lista = await leads.listarLeads(50);
    expect(lista.map((l) => l.nombre)).toEqual(["Laura Ejemplo", "Pedro {Prueba}"]);
    expect(lista.every((l) => l.assignmentStatus === "sin_asignar")).toBe(true);
    expect(lista[1].id).toBe("lead:+56900000001:1793018480000");
    expect(lista[0].id).toBe(`lead:56900000002:${Date.parse("2026-10-27T13:09:42.236Z")}`);
    expect(await leads.buscarLeadExistente({ email: "laura@x.cl" })).not.toBeNull();
  });

  it("es idempotente y no pisa un lead que ya está (mismo email)", async () => {
    const { leads, restaurar } = await cargar();
    await leads.guardarLead({ nombre: "Pedro real", rut: "1-9", email: "pedro@x.cl", telefono: "+56900000000" });
    const r1 = await restaurar.restaurarLeads(restaurar.extraerLeadsDeTexto(LOG), AHORA);
    expect(r1.yaExistian).toEqual(["Pedro {Prueba}"]);
    const r2 = await restaurar.restaurarLeads(restaurar.extraerLeadsDeTexto(LOG), AHORA);
    expect(r2.restaurados).toHaveLength(0);
    expect((await leads.listarLeads(50)).map((l) => l.nombre).sort()).toEqual(["Laura Ejemplo", "Pedro real"]);
  });

  it("descarta leads de más de 60 días o sin contacto", async () => {
    const { restaurar } = await cargar();
    const r = await restaurar.restaurarLeads(
      [
        { nombre: "Viejo", rut: "", email: "v@x.cl", fecha: "2026-08-01T00:00:00Z" },
        { nombre: "Sin contacto", rut: "", fecha: "2026-10-26T00:00:00Z" },
      ],
      AHORA,
    );
    expect(r.restaurados).toHaveLength(0);
    expect(r.descartados).toHaveLength(2);
  });
});
