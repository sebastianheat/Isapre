import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.RESEND_API_KEY;
  delete process.env.HEAT_API_KEY;
  delete process.env.VAPID_PUBLIC_KEY;
});

async function cargar() {
  vi.resetModules();
  const [pp, usuarios, credits, tipos] = await Promise.all([
    import("./planes-pagados"),
    import("./usuarios"),
    import("./credits-kv"),
    import("./planes-pagados-tipos"),
  ]);
  const [leads, reparto, imp] = await Promise.all([import("./leads"), import("./reparto"), import("./impugnaciones")]);
  return { pp, usuarios, credits, tipos, leads, reparto, imp };
}

const FOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const SUPER = "info@x.cl";
const JEFE = "claudio@x.cl";
const ANA = "ana@x.cl";

describe("regla de deuda (cada 20 leads que llegan = 1 plan)", () => {
  it("al recibir su cupo ya debe 1 plan, aunque no le haya llegado ningún lead", async () => {
    const { pp } = await cargar();
    expect(pp.calcularEstado(0, true, 0, 0)).toMatchObject({ bloques: 1, debe: 1, alDia: false });
    expect(pp.calcularEstado(0, false, 0, 0)).toMatchObject({ bloques: 0, debe: 0, alDia: true });
    expect(pp.calcularEstado(20, true, 1, 0)).toMatchObject({ debe: 0, alDia: true });
  });

  it("desde el lead 21 debe el 2º plan, desde el 41 el 3º", async () => {
    const { pp } = await cargar();
    expect(pp.calcularEstado(20, true, 0, 0)).toMatchObject({ bloques: 1, debe: 1 });
    expect(pp.calcularEstado(21, true, 0, 0)).toMatchObject({ bloques: 2, debe: 2 });
    expect(pp.calcularEstado(21, true, 1, 0)).toMatchObject({ debe: 1 });
    expect(pp.calcularEstado(40, true, 1, 1)).toMatchObject({ bloques: 2, debe: 1, enRevision: 1 });
    expect(pp.calcularEstado(41, true, 2, 0)).toMatchObject({ bloques: 3, debe: 1 });
  });

  it("texto del estado", async () => {
    const { tipos, pp } = await cargar();
    expect(tipos.textoEstado(pp.calcularEstado(17, true, 0, 1))).toBe("Debe 1 plan · 1 en revisión");
    expect(tipos.textoEstado(pp.calcularEstado(17, true, 1, 0))).toBe("OK");
    expect(tipos.textoEstado(pp.calcularEstado(45, true, 0, 0))).toBe("Debe 3 planes");
  });

  it("valida el RUT con dígito verificador", async () => {
    const { pp } = await cargar();
    expect(pp.rutValido("11.111.111-1")).toBe(true);
    expect(pp.rutValido("12345678-5")).toBe(true);
    expect(pp.rutValido("12.345.678-9")).toBe(false);
    expect(pp.rutValido("1-9")).toBe(false);
    expect(pp.formatearRut("123456785")).toBe("12.345.678-5");
  });
});

describe("registrar y validar un plan pagado", () => {
  let c: Awaited<ReturnType<typeof cargar>>;
  beforeEach(async () => {
    c = await cargar();
    await c.usuarios.crearUsuario({ email: ANA, password: "clave123", role: "ejecutivo", nombre: "Ana" });
    await c.usuarios.crearUsuario({ email: JEFE, password: "clave123", role: "admin", nombre: "Claudio" });
    for (const e of [ANA, JEFE]) {
      await c.credits.regalarCreditos({ email: e, cantidad: 20, motivo: "cupo", por: SUPER });
      await c.credits.regalarCreditos({ email: e, cantidad: 20, motivo: "reactivación", por: SUPER });
    }
  });

  it("con +20 nuevos debe 1; al validarle el plan queda OK", async () => {
    expect(await c.pp.estadoCuenta(ANA)).toMatchObject({ debe: 1 });
    const r = await c.pp.registrarPago(ANA, { clienteNombre: "Juan Pérez", clienteRut: "12.345.678-5", foto: FOTO });
    expect(r.ok).toBe(true);
    expect(await c.pp.estadoCuenta(ANA)).toMatchObject({ debe: 1, enRevision: 1 });
    expect(await c.pp.contarPorValidar(JEFE, "admin")).toBe(1);
    const id = r.ok ? r.pago.id : "";
    expect(await c.pp.validarPago(id, { aprobar: true, por: JEFE, rol: "admin" })).toMatchObject({ ok: true });
    expect(await c.pp.estadoCuenta(ANA)).toMatchObject({ debe: 0, validados: 1, alDia: true });
    expect(await c.pp.validarPago(id, { aprobar: true, por: SUPER, rol: "superadmin" })).toMatchObject({ ok: false, status: 409 });
    expect((await c.pp.fotoDePago(id))?.foto).toBe(FOTO);
  });

  it("exige nombre, RUT válido y foto", async () => {
    expect(await c.pp.registrarPago(ANA, { clienteNombre: "Juan", clienteRut: "12.345.678-9", foto: FOTO })).toMatchObject({ ok: false, status: 400 });
    expect(await c.pp.registrarPago(ANA, { clienteNombre: "Juan", clienteRut: "12.345.678-5", foto: "" })).toMatchObject({ ok: false, status: 400 });
    expect(await c.pp.registrarPago(ANA, { clienteNombre: "", clienteRut: "12.345.678-5", foto: FOTO })).toMatchObject({ ok: false, status: 400 });
  });

  it("rechazo con motivo obligatorio; el admin no valida los suyos ni un ejecutivo valida", async () => {
    const r = await c.pp.registrarPago(JEFE, { clienteNombre: "María Soto", clienteRut: "11.111.111-1", foto: FOTO });
    const id = r.ok ? r.pago.id : "";
    expect(await c.pp.contarPorValidar(JEFE, "admin")).toBe(0);
    expect(await c.pp.validarPago(id, { aprobar: true, por: JEFE, rol: "admin" })).toMatchObject({ ok: false, status: 403 });
    expect(await c.pp.validarPago(id, { aprobar: true, por: ANA, rol: "ejecutivo" })).toMatchObject({ ok: false, status: 403 });
    expect(await c.pp.validarPago(id, { aprobar: false, por: SUPER, rol: "superadmin" })).toMatchObject({ ok: false, status: 400 });
    expect(await c.pp.validarPago(id, { aprobar: false, motivo: "La foto no se ve", por: SUPER, rol: "superadmin" })).toMatchObject({ ok: true });
    expect(await c.pp.estadoCuenta(JEFE)).toMatchObject({ debe: 1, enRevision: 0 });
  });

  it("cuenta los leads que le llegan: con 21 debe 2; un falso devuelto no cuenta", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 21; i++) {
      const { lead } = await c.leads.guardarLead({ nombre: `L${i}`, rut: `${i}-1`, telefono: `5698800${String(i).padStart(4, "0")}` });
      await c.reparto.asignarLead(lead.id!, ANA, SUPER);
      ids.push(lead.id!);
    }
    expect(await c.pp.estadoCuenta(ANA)).toMatchObject({ entregados: 21, bloques: 2, debe: 2 });
    await c.imp.impugnarLead(ids[0], ANA, { motivos: ["telefono", "nombre"], comentario: "No tiene WhatsApp, nombre falso" });
    await c.imp.resolverImpugnacion(ids[0], { aceptar: true, por: SUPER });
    expect(await c.pp.estadoCuenta(ANA)).toMatchObject({ entregados: 20, bloques: 1, debe: 1 });
  });
});
