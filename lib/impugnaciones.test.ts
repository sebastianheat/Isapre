import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.RESEND_API_KEY;
  delete process.env.HEAT_API_KEY;
});

const ROCIO = "rocio@x.cl";
const SEBA = "seba@x.cl";
const ADMIN = "info@x.cl";
const VALIDA = { motivos: ["telefono", "nombre"], comentario: "El número no tiene WhatsApp y el nombre es jajaja" };

async function cargar() {
  vi.resetModules();
  const [leads, usuarios, credits, reparto, imp] = await Promise.all([
    import("./leads"),
    import("./usuarios"),
    import("./credits-kv"),
    import("./reparto"),
    import("./impugnaciones"),
  ]);
  return { leads, usuarios, credits, reparto, imp };
}
type Ctx = Awaited<ReturnType<typeof cargar>>;

async function crearEjecutivo(c: Ctx, email: string, saldo: number) {
  await c.usuarios.setUsuario({ email, passwordHash: "x", role: "ejecutivo", nombre: email, createdAt: "" });
  if (saldo > 0) await c.credits.regalarCreditos({ email, cantidad: saldo, motivo: "cupo", por: ADMIN });
}

let n = 0;
async function leadAsignado(c: Ctx, a: string, opts = {}): Promise<string> {
  n += 1;
  const { lead } = await c.leads.guardarLead({ nombre: "Jasjjaja", rut: `${n}-1`, telefono: `5697768711${n}`, email: `a${n}@aaa.cl` });
  const r = await c.reparto.asignarLead(lead.id!, a, ADMIN, opts);
  expect(r.ok).toBe(true);
  return lead.id!;
}

describe("impugnación de leads falsos", () => {
  let c: Ctx;
  beforeEach(async () => {
    c = await cargar();
    await crearEjecutivo(c, ROCIO, 3);
    await crearEjecutivo(c, SEBA, 3);
  });

  it("exige teléfono falso + nombre o correo, y un comentario", async () => {
    const id = await leadAsignado(c, ROCIO);
    const soloTel = await c.imp.impugnarLead(id, ROCIO, { motivos: ["telefono"], comentario: VALIDA.comentario });
    expect(soloTel).toMatchObject({ ok: false, status: 400 });
    const sinTel = await c.imp.impugnarLead(id, ROCIO, { motivos: ["nombre", "correo"], comentario: VALIDA.comentario });
    expect(sinTel).toMatchObject({ ok: false, status: 400 });
    const sinComentario = await c.imp.impugnarLead(id, ROCIO, { motivos: ["telefono", "correo"], comentario: "falso" });
    expect(sinComentario).toMatchObject({ ok: false, status: 400 });
    expect(await c.imp.impugnarLead(id, ROCIO, VALIDA)).toMatchObject({ ok: true });
  });

  it("solo el ejecutivo asignado puede impugnar, y una sola vez", async () => {
    const id = await leadAsignado(c, ROCIO);
    expect(await c.imp.impugnarLead(id, SEBA, VALIDA)).toMatchObject({ ok: false, status: 403 });
    expect(await c.imp.impugnarLead(id, ROCIO, VALIDA)).toMatchObject({ ok: true });
    expect(await c.imp.impugnarLead(id, ROCIO, VALIDA)).toMatchObject({ ok: false, status: 409 });
    expect(await c.imp.contarPendientes()).toBe(1);
  });

  it("aceptar devuelve el crédito y marca el lead como falso", async () => {
    const id = await leadAsignado(c, ROCIO);
    expect(await c.credits.obtenerSaldo(ROCIO)).toBe(2);
    await c.imp.impugnarLead(id, ROCIO, VALIDA);
    const r = await c.imp.resolverImpugnacion(id, { aceptar: true, por: ADMIN });
    expect(r.ok).toBe(true);
    expect(await c.credits.obtenerSaldo(ROCIO)).toBe(3);
    expect(await c.credits.recalcularSaldo(ROCIO)).toBe(3);
    const lead = await c.leads.obtenerLead(id);
    expect(lead).toMatchObject({ falso: true, etapa: "perdido", calidad: "no_calificado", asignacionCobrada: false });
    expect(lead?.impugnacion).toMatchObject({ estado: "aceptada", creditoDevuelto: true, resueltaPor: ADMIN });
    expect(await c.imp.contarPendientes()).toBe(0);
    // No se puede resolver dos veces (no devuelve dos créditos).
    expect(await c.imp.resolverImpugnacion(id, { aceptar: true, por: ADMIN })).toMatchObject({ ok: false, status: 409 });
    expect(await c.credits.obtenerSaldo(ROCIO)).toBe(3);
  });

  it("un lead regalado (sin cobro) se marca falso sin devolver nada", async () => {
    await c.credits.ajustarSaldo({ email: SEBA, saldo: 0, motivo: "test", por: ADMIN });
    const id = await leadAsignado(c, SEBA, { permitirSinSaldo: true });
    await c.imp.impugnarLead(id, SEBA, VALIDA);
    await c.imp.resolverImpugnacion(id, { aceptar: true, por: ADMIN });
    expect(await c.credits.obtenerSaldo(SEBA)).toBe(0);
    expect((await c.leads.obtenerLead(id))?.impugnacion?.creditoDevuelto).toBe(false);
  });

  it("rechazar exige motivo y deja el lead igual", async () => {
    const id = await leadAsignado(c, ROCIO);
    await c.imp.impugnarLead(id, ROCIO, VALIDA);
    expect(await c.imp.resolverImpugnacion(id, { aceptar: false, por: ADMIN })).toMatchObject({ ok: false, status: 400 });
    const r = await c.imp.resolverImpugnacion(id, { aceptar: false, respuesta: "El número sí tiene WhatsApp", por: ADMIN });
    expect(r.ok).toBe(true);
    const lead = await c.leads.obtenerLead(id);
    expect(lead?.falso).toBeUndefined();
    expect(lead?.impugnacion).toMatchObject({ estado: "rechazada", respuesta: "El número sí tiene WhatsApp" });
    expect(await c.credits.obtenerSaldo(ROCIO)).toBe(2);
    expect(await c.imp.impugnarLead(id, ROCIO, VALIDA)).toMatchObject({ ok: false, status: 409 });
  });

  it("el ejecutivo puede retirarla si el cliente contestó, y queda fuera de pendientes", async () => {
    const id = await leadAsignado(c, ROCIO);
    await c.imp.impugnarLead(id, ROCIO, VALIDA);
    expect(await c.imp.retirarImpugnacion(id, SEBA)).toMatchObject({ ok: false, status: 403 });
    expect(await c.imp.retirarImpugnacion(id, ROCIO)).toMatchObject({ ok: true });
    expect(await c.imp.contarPendientes()).toBe(0);
    const { pendientes, resueltas } = await c.imp.listarImpugnaciones();
    expect(pendientes).toHaveLength(0);
    expect(resueltas[0].impugnacion?.estado).toBe("retirada");
    expect(await c.imp.resolverImpugnacion(id, { aceptar: true, por: ADMIN })).toMatchObject({ ok: false, status: 409 });
  });

  it("si el lead se reasignó mientras tanto, se marca falso pero no se devuelve el crédito a quien ya no lo tiene", async () => {
    const id = await leadAsignado(c, ROCIO);
    await c.imp.impugnarLead(id, ROCIO, VALIDA);
    await c.reparto.reasignarLead(id, SEBA, ADMIN); // a Rocío se le devuelve aquí
    expect(await c.credits.obtenerSaldo(ROCIO)).toBe(3);
    await c.imp.resolverImpugnacion(id, { aceptar: true, por: ADMIN });
    expect(await c.credits.obtenerSaldo(ROCIO)).toBe(3);
    expect((await c.leads.obtenerLead(id))?.falso).toBe(true);
  });
});
