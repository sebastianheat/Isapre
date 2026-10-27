import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.RESEND_API_KEY;
  delete process.env.HEAT_API_KEY;
});

const ANA = "ana@x.cl";

describe("calcularFila", () => {
  it("corresponde = recibidos − leads asignados que se le cobraron", async () => {
    const { calcularFila } = await import("./conciliar-creditos");
    const f = calcularFila(
      { email: ANA, nombre: "Ana" },
      20,
      [
        { tipo: "regalo", cantidad: 20 },
        { tipo: "asignacion", cantidad: -1 },
        { tipo: "asignacion", cantidad: -1 },
        { tipo: "devolucion", cantidad: 1 },
      ],
      [
        { nombre: "a", rut: "", asignadoA: ANA, asignacionCobrada: true },
        { nombre: "b", rut: "", asignadoA: "Ana@X.cl", asignacionCobrada: false }, // regalo
        { nombre: "c", rut: "", asignadoA: ANA }, // de antes de los créditos
        { nombre: "d", rut: "", asignadoA: "otro@x.cl", asignacionCobrada: true },
      ],
    );
    expect(f).toMatchObject({
      saldoGuardado: 20,
      saldoHistorial: 19,
      recibidos: 20,
      cobrosHistorial: 1,
      leadsAsignados: 3,
      leadsCobrados: 1,
      saldoCorrecto: 19,
      diferencia: -1,
    });
  });
});

describe("ajustarSaldo", () => {
  it("deja contador e historial en el número pedido, con un movimiento de ajuste", async () => {
    vi.resetModules();
    const c = await import("./credits-kv");
    await c.regalarCreditos({ email: ANA, cantidad: 20, motivo: "cupo", por: "seba@x.cl" });
    await c.descontarCredito(ANA, { motivo: "lead", por: "seba@x.cl" });
    const r = await c.ajustarSaldo({ email: ANA, saldo: 15, motivo: "conciliación", por: "seba@x.cl" });
    expect(r.saldo).toBe(15);
    expect(await c.obtenerSaldo(ANA)).toBe(15);
    expect(await c.recalcularSaldo(ANA)).toBe(15);
    const [mov] = await c.listarMovimientos(ANA);
    expect(mov).toMatchObject({ tipo: "ajuste", cantidad: -4, motivo: "conciliación" });
    await expect(c.ajustarSaldo({ email: ANA, saldo: 3, motivo: " ", por: "x" })).rejects.toThrow(/motivo/);
    await expect(c.ajustarSaldo({ email: ANA, saldo: -1, motivo: "x", por: "x" })).rejects.toThrow();
  });
});
