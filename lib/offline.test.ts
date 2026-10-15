import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";

// Golden test del export de conversiones offline (Google Ads). La campaña
// activa depende de este CSV: su formato NO puede cambiar por el trabajo del
// marketplace (US-047). El CSV esperado se capturó sobre el código ANTES de la
// Fase 1; si este test falla, algo cambió el output del export.
//
// Corre contra el KV en memoria (sin credenciales Upstash). Se limpian las
// variables por si el shell del desarrollador las tiene exportadas — así el
// test jamás escribe en el KV real.
vi.hoisted(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});

const AHORA = "2026-10-02T15:00:00.000Z";

interface LeadSemilla {
  id: string;
  fecha: string;
  gclid?: string;
  calidad?: string;
  exportadoOffline?: string;
  [extra: string]: unknown;
}

// Mismo set de leads para todos los casos. Solo cambian los campos de
// asignación (que el export no debe mirar).
function semilla(extra: Record<string, unknown> = {}): LeadSemilla[] {
  const base = { nombre: "Cliente", rut: "1-9", canal: "google-ads", ...extra };
  return [
    { ...base, id: "lead:a:1", fecha: "2026-09-20T13:05:09.000Z", gclid: "GCLID-A", calidad: "calificado" },
    { ...base, id: "lead:b:2", fecha: "2026-09-25T02:30:00.000Z", gclid: "GCLID-B", calidad: "calificado" },
    { ...base, id: "lead:c:3", fecha: "2026-10-01T22:59:59.000Z", gclid: "GCLID-C", calidad: "calificado" },
    // No exportables: sin gclid, marginal, no calificado, ya exportado, fuera de ventana.
    { ...base, id: "lead:d:4", fecha: "2026-09-26T10:00:00.000Z", calidad: "calificado" },
    { ...base, id: "lead:e:5", fecha: "2026-09-26T10:00:00.000Z", gclid: "GCLID-E", calidad: "marginal" },
    { ...base, id: "lead:f:6", fecha: "2026-09-26T10:00:00.000Z", gclid: "GCLID-F", calidad: "no_calificado" },
    {
      ...base, id: "lead:g:7", fecha: "2026-09-26T10:00:00.000Z", gclid: "GCLID-G",
      calidad: "calificado", exportadoOffline: "2026-09-28T12:00:00.000Z",
    },
    { ...base, id: "lead:h:8", fecha: "2026-06-01T10:00:00.000Z", gclid: "GCLID-H", calidad: "calificado" },
  ];
}

// CSV capturado sobre el código previo a la Fase 1 (hora Santiago, CRLF).
const CSV_ESPERADO =
  "Parameters:TimeZone=America/Santiago\r\n" +
  "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency\r\n" +
  "GCLID-C,Lead Calificado,2026-10-01 19:59:59,11000,CLP\r\n" +
  "GCLID-B,Lead Calificado,2026-09-24 23:30:00,11000,CLP\r\n" +
  "GCLID-A,Lead Calificado,2026-09-20 10:05:09,11000,CLP\r\n";

async function sembrar(leads: LeadSemilla[]) {
  const store = await import("./store");
  for (const l of leads) {
    await store.kvSet(l.id, JSON.stringify(l), 0);
    await store.kvZAdd("leads:by-date", Date.parse(l.fecha), l.id);
  }
}

describe("generarCsvOffline (golden — export Google Ads intacto)", () => {
  beforeEach(() => {
    vi.resetModules(); // KV en memoria limpio por test
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(AHORA));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("produce el CSV byte-idéntico al capturado antes de la Fase 1", async () => {
    await sembrar(semilla());
    const { generarCsvOffline } = await import("./offline");
    const { csv, exportados } = await generarCsvOffline({ dias: 30 });
    expect(csv).toBe(CSV_ESPERADO);
    expect(exportados).toHaveLength(3);
    // Permite comparar archivos antes/después con `cmp` (ver RESUMEN.md).
    if (process.env.DUMP_CSV) writeFileSync(process.env.DUMP_CSV, csv);
  });

  it("es idéntico aunque los leads tengan campos de asignación (Fase 1)", async () => {
    await sembrar(
      semilla({ assignmentStatus: "asignado", asignadoA: "ingrid@nuevaisapre.cl", asignacionCobrada: true }),
    );
    const { generarCsvOffline } = await import("./offline");
    const { csv } = await generarCsvOffline({ dias: 30 });
    expect(csv).toBe(CSV_ESPERADO);
  });

  it("con marcar=true no repite los leads en el siguiente export", async () => {
    await sembrar(semilla());
    const { generarCsvOffline } = await import("./offline");
    const primero = await generarCsvOffline({ dias: 30, marcar: true });
    expect(primero.csv).toBe(CSV_ESPERADO);
    const segundo = await generarCsvOffline({ dias: 30, marcar: true });
    expect(segundo.exportados).toHaveLength(0);
    expect(segundo.csv.split("\r\n")).toHaveLength(3); // 2 headers + salto final
  });
});
