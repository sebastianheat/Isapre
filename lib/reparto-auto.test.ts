import { beforeEach, describe, expect, it, vi } from "vitest";

// KV en memoria: este test nunca debe tocar el Upstash real.
vi.hoisted(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.RESEND_API_KEY;
  delete process.env.HEAT_API_KEY;
});

const avisos = vi.hoisted(() => [] as { para: string; lead: string }[]);
vi.mock("./email", () => ({
  enviarLeadPorEmail: async () => {},
  enviarLeadAsignado: async (lead: { nombre: string }, ejecutivo: { email: string }) => {
    avisos.push({ para: ejecutivo.email, lead: lead.nombre });
  },
}));

async function cargar() {
  vi.resetModules();
  const [leads, usuarios, credits, auto, importar] = await Promise.all([
    import("./leads"),
    import("./usuarios"),
    import("./credits-kv"),
    import("./reparto-auto"),
    import("./importar-usuarios"),
  ]);
  return { leads, usuarios, credits, auto, importar };
}
type Ctx = Awaited<ReturnType<typeof cargar>>;

const ADMIN = "info@nuevaisapre.cl";

let n = 0;
async function nuevoLead(c: Ctx) {
  n += 1;
  const { lead } = await c.leads.guardarLead({ nombre: `Lead ${n}`, rut: `2${n}-9`, telefono: `5691111${n}` });
  return lead;
}

async function importar(c: Ctx, cupo: number, ...emails: string[]) {
  // createdAt distintos para que el orden de la rueda sea el de la lista.
  for (const email of emails) {
    await c.importar.importarUsuarios([{ email, nombre: email }], ADMIN, cupo);
    await new Promise((r) => setTimeout(r, 2));
  }
}

describe("reparto automático round robin", () => {
  let c: Ctx;
  beforeEach(async () => {
    c = await cargar();
    avisos.length = 0;
  });

  it("apagado por defecto: el lead nuevo queda sin asignar", async () => {
    await importar(c, 20, "a@x.cl");
    const lead = await nuevoLead(c);
    expect(lead.assignmentStatus).toBe("sin_asignar");
  });

  it("encendido: reparte por turnos y descuenta 1 de cupo a cada uno", async () => {
    await importar(c, 20, "a@x.cl", "b@x.cl", "c@x.cl");
    await c.auto.setRepartoAutomatico(true);
    const dueños = [];
    for (let i = 0; i < 6; i++) dueños.push((await nuevoLead(c)).asignadoA);
    expect(dueños).toEqual(["a@x.cl", "b@x.cl", "c@x.cl", "a@x.cl", "b@x.cl", "c@x.cl"]);
    expect(await c.credits.obtenerSaldo("a@x.cl")).toBe(18);
  });

  it("al completar su cupo sale de la rueda; los demás siguen", async () => {
    await importar(c, 1, "a@x.cl");
    await importar(c, 3, "b@x.cl");
    await c.auto.setRepartoAutomatico(true);
    const dueños = [];
    for (let i = 0; i < 4; i++) dueños.push((await nuevoLead(c)).asignadoA);
    expect(dueños).toEqual(["a@x.cl", "b@x.cl", "b@x.cl", "b@x.cl"]);
    // Nadie con cupo: el siguiente queda en la cola manual.
    expect((await nuevoLead(c)).assignmentStatus).toBe("sin_asignar");
  });

  it("reactivar cupo lo devuelve a la rueda", async () => {
    await importar(c, 1, "a@x.cl");
    await c.auto.setRepartoAutomatico(true);
    expect((await nuevoLead(c)).asignadoA).toBe("a@x.cl");
    expect((await nuevoLead(c)).assignmentStatus).toBe("sin_asignar");
    await c.credits.regalarCreditos({ email: "a@x.cl", cantidad: 20, motivo: "Reactivación", por: ADMIN });
    expect((await nuevoLead(c)).asignadoA).toBe("a@x.cl");
  });

  it("no reparte a quien tiene pausado recibir leads ni al superadmin", async () => {
    await importar(c, 5, "a@x.cl", "b@x.cl");
    await c.usuarios.setRecibiendoLeads("a@x.cl", false);
    await c.usuarios.setUsuario({
      email: ADMIN, passwordHash: "x", role: "superadmin", createdAt: "2000-01-01T00:00:00Z",
    });
    await c.credits.regalarCreditos({ email: ADMIN, cantidad: 5, motivo: "x", por: ADMIN });
    await c.auto.setRepartoAutomatico(true);
    expect((await nuevoLead(c)).asignadoA).toBe("b@x.cl");
    expect((await nuevoLead(c)).asignadoA).toBe("b@x.cl");
  });

  it("un lead repetido (mismo RUT) no se vuelve a repartir", async () => {
    await importar(c, 5, "a@x.cl", "b@x.cl");
    await c.auto.setRepartoAutomatico(true);
    const primero = await c.leads.guardarLead({ nombre: "Repetido", rut: "99-9" });
    const segundo = await c.leads.guardarLead({ nombre: "Repetido", rut: "99-9" });
    expect(segundo.esNuevo).toBe(false);
    expect(segundo.lead.asignadoA).toBe(primero.lead.asignadoA);
    expect(await c.credits.obtenerSaldo("a@x.cl")).toBe(4);
    expect(await c.credits.obtenerSaldo("b@x.cl")).toBe(5);
  });

  it("avisa por correo a cada ejecutivo el lead que le tocó", async () => {
    await importar(c, 5, "a@x.cl", "b@x.cl");
    await c.auto.setRepartoAutomatico(true);
    const l1 = await nuevoLead(c);
    const l2 = await nuevoLead(c);
    expect(avisos).toEqual([
      { para: "a@x.cl", lead: l1.nombre },
      { para: "b@x.cl", lead: l2.nombre },
    ]);
  });

  it("sin cupo no asigna ni manda correo", async () => {
    await c.auto.setRepartoAutomatico(true);
    await nuevoLead(c);
    expect(avisos).toHaveLength(0);
  });

  it("prioridad: los próximos N van al elegido y luego la rueda sigue donde iba", async () => {
    await importar(c, 20, "a@x.cl", "b@x.cl", "c@x.cl");
    await c.auto.setRepartoAutomatico(true);
    expect((await nuevoLead(c)).asignadoA).toBe("a@x.cl");
    await c.auto.setPrioridad("C@x.cl", 2);
    const dueños = [];
    for (let i = 0; i < 4; i++) dueños.push((await nuevoLead(c)).asignadoA);
    expect(dueños).toEqual(["c@x.cl", "c@x.cl", "b@x.cl", "c@x.cl"]);
    expect(await c.auto.obtenerPrioridad()).toBeNull();
  });

  it("prioridad para alguien sin cupo se cancela y el lead va a la rueda", async () => {
    await importar(c, 5, "a@x.cl");
    await importar(c, 0, "z@x.cl");
    await c.auto.setRepartoAutomatico(true);
    await c.auto.setPrioridad("z@x.cl", 2);
    expect((await nuevoLead(c)).asignadoA).toBe("a@x.cl");
    expect(await c.auto.obtenerPrioridad()).toBeNull();
  });
});
