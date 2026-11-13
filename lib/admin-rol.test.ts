import { beforeEach, describe, expect, it, vi } from "vitest";

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
  const [leads, usuarios, credits, reparto, imp, sol, acceso, equipo] = await Promise.all([
    import("./leads"),
    import("./usuarios"),
    import("./credits-kv"),
    import("./reparto"),
    import("./impugnaciones"),
    import("./solicitudes"),
    import("./acceso"),
    import("./equipo"),
  ]);
  return { leads, usuarios, credits, reparto, imp, sol, acceso, equipo };
}
type Ctx = Awaited<ReturnType<typeof cargar>>;

const SUPER = "info@x.cl";
const JEFE = "claudio@x.cl";
const ANA = "ana@x.cl";
const s = (email: string, role: "superadmin" | "admin" | "ejecutivo") => ({ email, role });

async function setup(c: Ctx) {
  await c.usuarios.crearUsuario({ email: JEFE, password: "clave123", role: "admin", nombre: "Claudio" });
  await c.usuarios.crearUsuario({ email: ANA, password: "clave123", role: "ejecutivo", nombre: "Ana" });
  for (const e of [JEFE, ANA]) await c.credits.regalarCreditos({ email: e, cantidad: 20, motivo: "cupo", por: SUPER });
  const { lead } = await c.leads.guardarLead({ nombre: "Jajaja", rut: "1-9", telefono: "56900000001", email: "a@aaa.cl" });
  await c.reparto.asignarLead(lead.id!, ANA, SUPER);
  return (await c.leads.obtenerLead(lead.id!))!;
}

describe("rol administrador (jefe de equipo)", () => {
  let c: Ctx;
  beforeEach(async () => {
    c = await cargar();
  });

  it("ve todos los leads, pero solo edita los suyos", async () => {
    const lead = await setup(c);
    expect(c.acceso.puedeVerLead(s(JEFE, "admin"), lead)).toBe(true);
    expect(c.acceso.puedeEditarLead(s(JEFE, "admin"), lead)).toBe(false);
    expect(c.acceso.filtrarLeadsVisibles(s(JEFE, "admin"), [lead])).toHaveLength(1);
    expect(c.acceso.puedeEditarLead(s(ANA, "ejecutivo"), lead)).toBe(true);
    expect(c.acceso.puedeVerLead(s("otro@x.cl", "ejecutivo"), lead)).toBe(false);
    expect(c.acceso.puedeEditarLead(s(SUPER, "superadmin"), lead)).toBe(true);
  });

  it("pide pausar a un vendedor; no cambia nada hasta que el superadmin aprueba", async () => {
    await setup(c);
    const r = await c.sol.crearSolicitud(JEFE, { tipo: "pausar", email: ANA, motivo: "Está de vacaciones" });
    expect(r.ok).toBe(true);
    expect((await c.usuarios.getUsuario(ANA))?.recibiendoLeads).not.toBe(false);
    expect(await c.sol.crearSolicitud(JEFE, { tipo: "pausar", email: ANA, motivo: "otra vez" })).toMatchObject({ ok: false, status: 409 });
    const id = r.ok ? r.solicitud.id : "";
    expect(await c.sol.resolverSolicitud(id, { aprobar: false, por: SUPER })).toMatchObject({ ok: false, status: 400 });
    expect(await c.sol.resolverSolicitud(id, { aprobar: true, por: SUPER })).toMatchObject({ ok: true });
    expect((await c.usuarios.getUsuario(ANA))?.recibiendoLeads).toBe(false);
    expect(await c.sol.listarPendientes()).toHaveLength(0);
    expect((await c.sol.listarResueltas())[0]).toMatchObject({ estado: "aprobada", resueltaPor: SUPER });
  });

  it("solicitud rechazada: el vendedor queda igual", async () => {
    await setup(c);
    const r = await c.sol.crearSolicitud(JEFE, { tipo: "pausar", email: ANA, motivo: "No contesta" });
    const id = r.ok ? r.solicitud.id : "";
    await c.sol.resolverSolicitud(id, { aprobar: false, respuesta: "Hablemos primero", por: SUPER });
    expect((await c.usuarios.getUsuario(ANA))?.recibiendoLeads).not.toBe(false);
  });

  it("impugnación: el jefe da la 1ª aprobación y el superadmin la final", async () => {
    const lead = await setup(c);
    await c.imp.impugnarLead(lead.id!, ANA, { motivos: ["telefono", "nombre"], comentario: "No tiene WhatsApp, nombre jajaja" });
    expect(await c.imp.contarSinRevisar()).toBe(1);
    const rev = await c.imp.revisarImpugnacion(lead.id!, { aprueba: true, por: JEFE });
    expect(rev.ok).toBe(true);
    expect(await c.imp.contarSinRevisar()).toBe(0);
    expect(await c.imp.contarPendientes()).toBe(1); // sigue esperando al superadmin
    expect(await c.imp.revisarImpugnacion(lead.id!, { aprueba: true, por: JEFE })).toMatchObject({ ok: false, status: 409 });
    expect((await c.leads.obtenerLead(lead.id!))?.falso).toBeUndefined();
    await c.imp.resolverImpugnacion(lead.id!, { aceptar: true, por: SUPER });
    const final = await c.leads.obtenerLead(lead.id!);
    expect(final?.falso).toBe(true);
    expect(final?.impugnacion?.revisionAdmin).toMatchObject({ aprueba: true, por: JEFE });
  });

  it("si el jefe dice que no es falso, debe explicar por qué", async () => {
    const lead = await setup(c);
    await c.imp.impugnarLead(lead.id!, ANA, { motivos: ["telefono", "correo"], comentario: "No tiene WhatsApp ni correo real" });
    expect(await c.imp.revisarImpugnacion(lead.id!, { aprueba: false, por: JEFE })).toMatchObject({ ok: false, status: 400 });
    expect(await c.imp.revisarImpugnacion(lead.id!, { aprueba: false, comentario: "Le escribí y respondió", por: JEFE })).toMatchObject({ ok: true });
  });

  it("la tabla Equipo cuenta los leads de cada vendedor sin los falsos", async () => {
    const lead = await setup(c);
    const filas = c.equipo.resumenEquipo(
      [{ email: ANA, nombre: "Ana", saldo: 19 }, { email: JEFE, nombre: "Claudio", saldo: 20 }],
      [lead, { ...lead, id: "x", falso: true }, { ...lead, id: "y", etapa: "ganado" }],
    );
    expect(filas[0]).toMatchObject({ nombre: "Ana", asignados: 2, sinContactar: 1, ganados: 1 });
    expect(filas[1]).toMatchObject({ nombre: "Claudio", asignados: 0 });
  });
});
