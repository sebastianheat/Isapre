import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.RESEND_API_KEY;
  delete process.env.HEAT_API_KEY;
  delete process.env.VAPID_PUBLIC_KEY;
});

const SUPER = "info@x.cl";
const JEFE = "claudio@x.cl";
const ANA = "ana@x.cl";

async function cargar() {
  const [t, leads, usuarios, credits, reparto, imp, pp] = await Promise.all([
    import("./traspaso"),
    import("./leads"),
    import("./usuarios"),
    import("./credits-kv"),
    import("./reparto"),
    import("./impugnaciones"),
    import("./planes-pagados"),
  ]);
  return { t, leads, usuarios, credits, reparto, imp, pp };
}

describe("traspaso al jefe de equipo", () => {
  it("elige sin dueño (sin asignar, Cynthia, info@) e impugnados; no los ganados ni los del equipo", async () => {
    const { t } = await cargar();
    const l = (nombre: string, extra: object) => ({ nombre, rut: "", ...extra });
    const c = t.elegirCandidatos(
      [
        l("sin asignar", {}),
        l("de cynthia", { asignadoA: "nutri@x.cl", etapa: "perdido" }),
        l("de info", { asignadoA: SUPER }),
        l("ganado viejo", { asignadoA: "nutri@x.cl", etapa: "ganado" }),
        l("de ana", { asignadoA: ANA }),
        l("impugnado de ana", { asignadoA: ANA, falso: true }),
        l("impugnado ya del jefe", { asignadoA: JEFE, falso: true }),
      ],
      [ANA, JEFE],
      JEFE,
    );
    expect(c.sinDueno.map((x) => x.nombre)).toEqual(["sin asignar", "de cynthia", "de info"]);
    expect(c.impugnados.map((x) => x.nombre)).toEqual(["impugnado de ana"]);
  });

  it("traspasa sin costo; al aceptar una impugnación el lead pasa solo al jefe en etapa Impugnado", async () => {
    const { t, leads, usuarios, credits, reparto, imp, pp } = await cargar();
    await usuarios.crearUsuario({ email: JEFE, password: "clave123", role: "admin", nombre: "Claudio" });
    await usuarios.crearUsuario({ email: ANA, password: "clave123", role: "ejecutivo", nombre: "Ana" });
    for (const e of [JEFE, ANA]) await credits.regalarCreditos({ email: e, cantidad: 20, motivo: "cupo", por: SUPER });
    expect(await t.jefeDeEquipo()).toMatchObject({ email: JEFE });

    const { lead: viejo } = await leads.guardarLead({ nombre: "Viejo", rut: "1-9", telefono: "56911110000" });
    const r = await t.traspasarCandidatos(JEFE, SUPER);
    expect(r).toMatchObject({ sinDueno: 1, impugnados: 0 });
    expect(await leads.obtenerLead(viejo.id!)).toMatchObject({ asignadoA: JEFE, asignacionCobrada: false });
    expect(await credits.obtenerSaldo(JEFE)).toBe(20);
    expect(await pp.estadoCuenta(JEFE)).toMatchObject({ entregados: 0 });

    const { lead: falso } = await leads.guardarLead({ nombre: "Jajaja", rut: "2-7", telefono: "56922220000" });
    await reparto.asignarLead(falso.id!, ANA, SUPER);
    await imp.impugnarLead(falso.id!, ANA, { motivos: ["telefono", "nombre"], comentario: "No tiene WhatsApp, nombre falso" });
    await imp.resolverImpugnacion(falso.id!, { aceptar: true, por: SUPER });
    expect(await leads.obtenerLead(falso.id!)).toMatchObject({ asignadoA: JEFE, etapa: "impugnado", falso: true, asignacionCobrada: false });
    expect(await credits.obtenerSaldo(ANA)).toBe(20); // a Ana se le devolvió el crédito
    expect(await credits.obtenerSaldo(JEFE)).toBe(20); // a Claudio no se le cobró
    expect((await t.candidatosTraspaso(JEFE)).impugnados).toHaveLength(0);
  });
});
