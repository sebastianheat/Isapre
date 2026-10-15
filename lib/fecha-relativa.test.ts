import { describe, expect, it } from "vitest";
import { fechaRelativa } from "./fecha-relativa";

const AHORA = Date.parse("2026-10-02T15:00:00.000Z");
const hace = (ms: number) => new Date(AHORA - ms).toISOString();
const MIN = 60_000;

describe("fechaRelativa", () => {
  it.each([
    [10_000, "hace instantes"],
    [12 * MIN, "hace 12 min"],
    [59 * MIN, "hace 59 min"],
    [60 * MIN, "hace 1h"],
    [2 * 60 * MIN + 30 * MIN, "hace 2h"],
    [24 * 60 * MIN, "hace 1 día"],
    [3 * 24 * 60 * MIN, "hace 3 días"],
  ])("hace %i ms → %s", (ms, esperado) => {
    expect(fechaRelativa(hace(ms), AHORA)).toBe(esperado);
  });

  it("devuelve — si la fecha falta o es inválida", () => {
    expect(fechaRelativa(undefined, AHORA)).toBe("—");
    expect(fechaRelativa("no-es-fecha", AHORA)).toBe("—");
  });
});
