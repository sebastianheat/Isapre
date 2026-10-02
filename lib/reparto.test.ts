import { beforeEach, describe, expect, it, vi } from "vitest";

// KV en memoria: este test nunca debe tocar el Upstash real. Sin RESEND ni
// HEAT configurados, guardarLead no manda emails ni empuja al CRM.
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
  const [store, leads, usuarios, credits, reparto] = await Promise.all([
    import("./store"),
    import("./leads"),
    import("./usuarios"),
    import("./credits-kv"),
    import("./reparto"),
  ]);
  return { store, leads, usuarios, credits, reparto };
}
type Ctx = Awaited<ReturnType<typeof cargar>>;

const CYNTHIA = "cynthia@x.cl";
const INGRID = "ingrid@x.cl";
const SEBA = "seba@x.cl";

async function crearEjecutivo(c: Ctx, email: string, nombre: string, saldo = 0, recibiendoLeads?: boolean) {
  await c.usuarios.setUsuario({
    email, passwordHash: "x", role: "ejecutivo", nombre, createdAt: new Date().toISOString(),
    ...(recibiendoLeads === undefined ? {} : { recibiendoLeads }),
  });
  if (saldo > 0) await c.credits.regalarCreditos({ email, cantidad: saldo, motivo: "setup", por: CYNTHIA });
}

let n = 0;
async function crearLead(c: Ctx): Promise<string> {
  n += 1;
  const { lead } = await c.leads.guardarLead({ nombre: `Lead ${n}`, rut: `1${n}-9`, telefono: `5690000${n}` });
  return lead.id!;
}

describe("asignarLead", () => {
  let c: Ctx;
  beforeEach(async () => {
    c = await cargar();
    await crearEjecutivo(c, INGRID, "Ingrid", 3);
    await crearEjecutivo(c, SEBA, "Seba", 3);
  });

  it("un lead nuevo nace sin_asignar", async () => {
    const id = await crearLead(c);
    const lead = await c.leads.obtenerLead(id);
    expect(lead?.assignmentStatus).toBe("sin_asignar");
  });

  it("asigna, descuenta 1 crédito y deja el movimiento en el ledger", async () => {
    const id = await crearLead(c);
    const r = await c.reparto.asignarLead(id, INGRID, CYNTHIA);
    expect(r).toMatchObject({ ok: true, cobrado: true, saldo: 2 });
    const lead = await c.leads.obtenerLead(id);
    expect(lead).toMatchObject({ asignadoA: INGRID, assignmentStatus: "asignado", asignacionCobrada: true });
    expect(await c.credits.obtenerSaldo(INGRID)).toBe(2);
    const [mov] = await c.credits.listarMovimientos(INGRID);
    expect(mov).toMatchObject({ tipo: "asignacion", cantidad: -1, por: CYNTHIA, leadId: id });
  });

  it("no asigna dos veces: el segundo intento ve quién lo tiene", async () => {
    const id = await crearLead(c);
    await c.reparto.asignarLead(id, INGRID, CYNTHIA);
    const r = await c.reparto.asignarLead(id, SEBA, CYNTHIA);
    expect(r).toMatchObject({ ok: false, code: "ya_asignado", mensaje: "Este lead ya fue asignado a Ingrid" });
    expect(await c.credits.obtenerSaldo(SEBA)).toBe(3);
    expect((await c.leads.obtenerLead(id))?.asignadoA).toBe(INGRID);
  });

  it("dos asignaciones simultáneas: solo una tiene efecto y se cobra un único crédito", async () => {
    const id = await crearLead(c);
    const [r1, r2] = await Promise.all([
      c.reparto.asignarLead(id, INGRID, CYNTHIA),
      c.reparto.asignarLead(id, SEBA, CYNTHIA),
    ]);
    expect([r1.ok, r2.ok].sort()).toEqual([false, true]);
    const perdedora = r1.ok ? r2 : r1;
    expect(perdedora).toMatchObject({ ok: false });
    expect(["ya_asignado", "en_proceso"]).toContain((perdedora as { code: string }).code);
    const total = (await c.credits.obtenerSaldo(INGRID)) + (await c.credits.obtenerSaldo(SEBA));
    expect(total).toBe(5); // 6 - 1
  });

  it("sin saldo: avisa y no cambia nada", async () => {
    await crearEjecutivo(c, "pobre@x.cl", "Pobre", 0);
    const id = await crearLead(c);
    const r = await c.reparto.asignarLead(id, "pobre@x.cl", CYNTHIA);
    expect(r).toMatchObject({
      ok: false, code: "sin_saldo",
      mensaje: "Este ejecutivo no tiene créditos. ¿Asignar igual como regalo?",
    });
    expect((await c.leads.obtenerLead(id))?.assignmentStatus).toBe("sin_asignar");
    expect(await c.credits.obtenerSaldo("pobre@x.cl")).toBe(0);
  });

  it("sin saldo y confirmado como regalo: asigna sin descontar y lo deja registrado", async () => {
    await crearEjecutivo(c, "pobre@x.cl", "Pobre", 0);
    const id = await crearLead(c);
    const r = await c.reparto.asignarLead(id, "pobre@x.cl", CYNTHIA, { permitirSinSaldo: true });
    expect(r).toMatchObject({ ok: true, cobrado: false });
    expect(await c.credits.obtenerSaldo("pobre@x.cl")).toBe(0);
    const lead = await c.leads.obtenerLead(id);
    expect(lead).toMatchObject({ asignadoA: "pobre@x.cl", asignacionCobrada: false });
    const [mov] = await c.credits.listarMovimientos("pobre@x.cl");
    expect(mov).toMatchObject({ tipo: "asignacion", cantidad: 0 });
  });

  it("el lock se libera tras un rechazo: se puede reintentar", async () => {
    await crearEjecutivo(c, "pobre@x.cl", "Pobre", 0);
    const id = await crearLead(c);
    await c.reparto.asignarLead(id, "pobre@x.cl", CYNTHIA);
    const r = await c.reparto.asignarLead(id, INGRID, CYNTHIA);
    expect(r.ok).toBe(true);
  });

  it("rechaza ejecutivo inexistente y lead inexistente", async () => {
    const id = await crearLead(c);
    expect(await c.reparto.asignarLead(id, "fantasma@x.cl", CYNTHIA)).toMatchObject({ code: "ejecutivo_invalido" });
    expect(await c.reparto.asignarLead("lead:nope:1", INGRID, CYNTHIA)).toMatchObject({ code: "lead_no_encontrado" });
  });

  it("un lead legacy con asignadoA (sin assignmentStatus) cuenta como asignado", async () => {
    await c.store.kvSet("lead:legacy:1", JSON.stringify({
      id: "lead:legacy:1", nombre: "Viejo", rut: "1-9", fecha: "2026-09-01T10:00:00.000Z", asignadoA: SEBA,
    }), 0);
    const r = await c.reparto.asignarLead("lead:legacy:1", INGRID, CYNTHIA);
    expect(r).toMatchObject({ ok: false, code: "ya_asignado" });
  });
});

describe("interruptor recibiendoLeads (US-007)", () => {
  it("no asigna ni reasigna a un ejecutivo con el interruptor apagado", async () => {
    const c = await cargar();
    await crearEjecutivo(c, INGRID, "Ingrid", 3, false);
    await crearEjecutivo(c, SEBA, "Seba", 3);
    const id = await crearLead(c);
    expect(await c.reparto.asignarLead(id, INGRID, CYNTHIA)).toMatchObject({
      ok: false, code: "no_recibe_leads",
    });
    expect(await c.credits.obtenerSaldo(INGRID)).toBe(3);
    await c.reparto.asignarLead(id, SEBA, CYNTHIA);
    expect(await c.reparto.reasignarLead(id, INGRID, CYNTHIA)).toMatchObject({ code: "no_recibe_leads" });
    expect((await c.leads.obtenerLead(id))?.asignadoA).toBe(SEBA);
  });

  it("un ejecutivo sin el campo (previo a la Fase 1) sigue recibiendo leads", async () => {
    const c = await cargar();
    await crearEjecutivo(c, INGRID, "Ingrid", 1); // sin recibiendoLeads
    const id = await crearLead(c);
    expect((await c.reparto.asignarLead(id, INGRID, CYNTHIA)).ok).toBe(true);
  });
});

describe("reasignarLead (US-006b)", () => {
  let c: Ctx;
  beforeEach(async () => {
    c = await cargar();
    await crearEjecutivo(c, INGRID, "Ingrid", 3);
    await crearEjecutivo(c, SEBA, "Seba", 3);
  });

  it("devuelve el crédito al original, descuenta al nuevo y registra el motivo", async () => {
    const id = await crearLead(c);
    await c.reparto.asignarLead(id, INGRID, CYNTHIA);
    const r = await c.reparto.reasignarLead(id, SEBA, CYNTHIA);
    expect(r).toMatchObject({ ok: true, cobrado: true });
    expect(await c.credits.obtenerSaldo(INGRID)).toBe(3);
    expect(await c.credits.obtenerSaldo(SEBA)).toBe(2);
    expect((await c.leads.obtenerLead(id))).toMatchObject({ asignadoA: SEBA, assignmentStatus: "asignado" });
    const [devolucion] = await c.credits.listarMovimientos(INGRID);
    expect(devolucion).toMatchObject({ tipo: "devolucion", cantidad: 1, motivo: "corrección de asignación", leadId: id });
    const [cobro] = await c.credits.listarMovimientos(SEBA);
    expect(cobro).toMatchObject({ tipo: "asignacion", cantidad: -1, motivo: "corrección de asignación" });
  });

  it("no devuelve crédito si la asignación original fue sin costo (regalo)", async () => {
    await crearEjecutivo(c, "pobre@x.cl", "Pobre", 0);
    const id = await crearLead(c);
    await c.reparto.asignarLead(id, "pobre@x.cl", CYNTHIA, { permitirSinSaldo: true });
    await c.reparto.reasignarLead(id, SEBA, CYNTHIA);
    expect(await c.credits.obtenerSaldo("pobre@x.cl")).toBe(0);
    expect(await c.credits.obtenerSaldo(SEBA)).toBe(2);
  });

  it("si el nuevo no tiene saldo no toca nada (ni devuelve al original)", async () => {
    await crearEjecutivo(c, "pobre@x.cl", "Pobre", 0);
    const id = await crearLead(c);
    await c.reparto.asignarLead(id, INGRID, CYNTHIA);
    const r = await c.reparto.reasignarLead(id, "pobre@x.cl", CYNTHIA);
    expect(r).toMatchObject({ ok: false, code: "sin_saldo" });
    expect(await c.credits.obtenerSaldo(INGRID)).toBe(2);
    expect((await c.leads.obtenerLead(id))?.asignadoA).toBe(INGRID);
  });

  it("rechaza reasignar al mismo ejecutivo o un lead sin asignar", async () => {
    const id = await crearLead(c);
    expect(await c.reparto.reasignarLead(id, INGRID, CYNTHIA)).toMatchObject({ code: "no_asignado" });
    await c.reparto.asignarLead(id, INGRID, CYNTHIA);
    expect(await c.reparto.reasignarLead(id, INGRID, CYNTHIA)).toMatchObject({ code: "mismo_ejecutivo" });
    expect(await c.credits.obtenerSaldo(INGRID)).toBe(2);
  });

  it("sin límite de tiempo: se puede reasignar varias veces y los saldos cuadran", async () => {
    const id = await crearLead(c);
    await c.reparto.asignarLead(id, INGRID, CYNTHIA);
    await c.reparto.reasignarLead(id, SEBA, CYNTHIA);
    await c.reparto.reasignarLead(id, INGRID, CYNTHIA);
    expect(await c.credits.obtenerSaldo(INGRID)).toBe(2);
    expect(await c.credits.obtenerSaldo(SEBA)).toBe(3);
    expect(await c.credits.recalcularSaldo(INGRID)).toBe(2); // 3 regalo -1 +1 -1
  });
});

describe("listarLeadsSinAsignar", () => {
  it("más antiguo primero; excluye asignados y cerrados; incluye leads previos a la Fase 1", async () => {
    const c = await cargar();
    const base = { rut: "1-9", nombre: "L" };
    const sembrar = (id: string, fecha: string, extra: Record<string, unknown> = {}) =>
      c.store.kvSet(id, JSON.stringify({ ...base, id, fecha, ...extra }), 0).then(() =>
        c.store.kvZAdd("leads:by-date", Date.parse(fecha), id));
    await sembrar("lead:3", "2026-10-02T10:00:00.000Z", { assignmentStatus: "sin_asignar" });
    await sembrar("lead:1", "2026-09-30T10:00:00.000Z"); // legacy sin campo ni asignadoA
    await sembrar("lead:2", "2026-10-01T10:00:00.000Z", { assignmentStatus: "sin_asignar" });
    await sembrar("lead:4", "2026-10-01T11:00:00.000Z", { assignmentStatus: "asignado", asignadoA: SEBA });
    await sembrar("lead:5", "2026-09-29T10:00:00.000Z", { asignadoA: SEBA }); // legacy asignado
    await sembrar("lead:6", "2026-09-28T10:00:00.000Z", { etapa: "perdido" });
    const cola = await c.leads.listarLeadsSinAsignar();
    expect(cola.map((l) => l.id)).toEqual(["lead:1", "lead:2", "lead:3"]);
  });
});
