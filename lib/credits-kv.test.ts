import { beforeEach, describe, expect, it, vi } from "vitest";

// KV en memoria: este test nunca debe tocar el Upstash real.
vi.hoisted(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});

async function cargar() {
  vi.resetModules();
  return await import("./credits-kv");
}

describe("credits-kv", () => {
  let c: Awaited<ReturnType<typeof cargar>>;
  beforeEach(async () => {
    c = await cargar();
  });

  it("un ejecutivo sin movimientos tiene saldo 0 e historial vacío", async () => {
    expect(await c.obtenerSaldo("nuevo@x.cl")).toBe(0);
    expect(await c.listarMovimientos("nuevo@x.cl")).toEqual([]);
  });

  it("regalarCreditos suma al saldo y deja el movimiento con motivo y autor", async () => {
    const r = await c.regalarCreditos({
      email: "ingrid@x.cl", cantidad: 5, motivo: "Arranque Fase 1", por: "cynthia@x.cl",
    });
    expect(r.saldo).toBe(5);
    expect(await c.obtenerSaldo("ingrid@x.cl")).toBe(5);
    const movs = await c.listarMovimientos("ingrid@x.cl");
    expect(movs).toHaveLength(1);
    expect(movs[0]).toMatchObject({
      tipo: "regalo", cantidad: 5, motivo: "Arranque Fase 1", por: "cynthia@x.cl",
    });
    expect(movs[0].fecha).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("rechaza motivo vacío o solo espacios", async () => {
    await expect(
      c.regalarCreditos({ email: "a@x.cl", cantidad: 1, motivo: "   ", por: "s@x.cl" }),
    ).rejects.toThrow("Escribe un motivo para este movimiento");
    expect(await c.obtenerSaldo("a@x.cl")).toBe(0);
  });

  it.each([0, -3, 1.5, Number.NaN])("rechaza cantidad inválida (%s)", async (cantidad) => {
    await expect(
      c.regalarCreditos({ email: "a@x.cl", cantidad, motivo: "m", por: "s@x.cl" }),
    ).rejects.toThrow("entero positivo");
    expect(await c.obtenerSaldo("a@x.cl")).toBe(0);
  });

  it("normaliza el email (mayúsculas y espacios)", async () => {
    await c.regalarCreditos({ email: " Ingrid@X.cl ", cantidad: 2, motivo: "m", por: "s@x.cl" });
    expect(await c.obtenerSaldo("ingrid@x.cl")).toBe(2);
  });

  it("descontarCredito baja el saldo y registra -1", async () => {
    await c.regalarCreditos({ email: "a@x.cl", cantidad: 2, motivo: "m", por: "s@x.cl" });
    const r = await c.descontarCredito("a@x.cl", { motivo: "Asignación de lead", por: "s@x.cl", leadId: "lead:1" });
    expect(r).toEqual({ ok: true, saldo: 1 });
    const [ultimo] = await c.listarMovimientos("a@x.cl");
    expect(ultimo).toMatchObject({ tipo: "asignacion", cantidad: -1, leadId: "lead:1" });
  });

  it("descontarCredito sin saldo no deja el saldo negativo ni registra movimiento", async () => {
    const r = await c.descontarCredito("a@x.cl", { motivo: "m", por: "s@x.cl" });
    expect(r.ok).toBe(false);
    expect(await c.obtenerSaldo("a@x.cl")).toBe(0);
    expect(await c.listarMovimientos("a@x.cl")).toEqual([]);
  });

  it("dos descuentos simultáneos con 1 solo crédito: solo uno tiene efecto", async () => {
    await c.regalarCreditos({ email: "a@x.cl", cantidad: 1, motivo: "m", por: "s@x.cl" });
    const [r1, r2] = await Promise.all([
      c.descontarCredito("a@x.cl", { motivo: "m", por: "s@x.cl" }),
      c.descontarCredito("a@x.cl", { motivo: "m", por: "s@x.cl" }),
    ]);
    expect([r1.ok, r2.ok].sort()).toEqual([false, true]);
    expect(await c.obtenerSaldo("a@x.cl")).toBe(0);
  });

  it("devolverCredito suma 1 y registra la devolución", async () => {
    const saldo = await c.devolverCredito("a@x.cl", { motivo: "corrección de asignación", por: "s@x.cl" });
    expect(saldo).toBe(1);
    const [m] = await c.listarMovimientos("a@x.cl");
    expect(m).toMatchObject({ tipo: "devolucion", cantidad: 1 });
  });

  it("el historial va del más reciente al más antiguo y recalcularSaldo coincide con el saldo", async () => {
    await c.regalarCreditos({ email: "a@x.cl", cantidad: 3, motivo: "primero", por: "s@x.cl" });
    await c.descontarCredito("a@x.cl", { motivo: "segundo", por: "s@x.cl" });
    await c.regalarCreditos({ email: "a@x.cl", cantidad: 2, motivo: "tercero", por: "s@x.cl" });
    const movs = await c.listarMovimientos("a@x.cl");
    expect(movs.map((m) => m.motivo)).toEqual(["tercero", "segundo", "primero"]);
    expect(await c.recalcularSaldo("a@x.cl")).toBe(4);
    expect(await c.obtenerSaldo("a@x.cl")).toBe(4);
  });

  it("los saldos de distintos ejecutivos son independientes", async () => {
    await c.regalarCreditos({ email: "a@x.cl", cantidad: 3, motivo: "m", por: "s@x.cl" });
    expect(await c.obtenerSaldo("b@x.cl")).toBe(0);
  });
});
